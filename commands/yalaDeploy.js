const enquirer = require('enquirer');
const { prompt } = enquirer;
const chalk = require('chalk');
const fs = require('fs');
const ora = require('ora');
const axios = require('axios');
const FormData = require('form-data');
const JSZip = require('jszip');
const { log } = require('../utils/log.js');
const { spawn } = require('child_process');
const {
	checkNodeVersion,
	getNowUIJson,
	createFile,
	printHeader,
	getProfilesJson,
	getProfile
} = require('../utils/utilities.js');
const path = require('path');

/**
 * Runs the 'snc ui-component deploy' command with the profile flag. Has the option to add a force deploy
 * @param {string} profile the profile to use for the deploy
 * @param {string} nodeVersion the current version of node being run
 * @param {boolean} forceDeploy boolean indicating if the --force flag should be added to the command
 * @returns boolean indicating if the SN deploy was successful
 */
const runSNDeploy = async (profile, nodeVersion, forceDeploy) => {
	printHeader('Deploying to ServiceNow');

	let commandSuccessful = true;
	const commandPromise = new Promise((resolve, reject) => {
		const args = ['ui-component', 'deploy', '--profile', profile];
		if (nodeVersion == '12.16.1' || forceDeploy) args.push('--force');

		// Spawn child process to run the 'snc ui-component deploy' command
		const deployCommand = spawn('snc', args, {
			stdio: [0, 'pipe', 0]
		});

		deployCommand.stdout.on('data', output => {
			if (output.includes('Deployment to') && output.includes('failed')) {
				process.stdout.write(chalk.red(`${output}`));
				commandSuccessful = false;
			} else {
				process.stdout.write(`${output}`);
			}
		});

		deployCommand.on('close', code => {
			resolve(commandSuccessful);
		});
	});

	return commandPromise;
};

/**
 * Creates a backup copy of the now-ui.json without any changes and then removes the 'actions' property of each component
 * and overwrites the existing now-ui.json
 * @param {object} nowUIJson object containing the now-ui.json data
 * @param {string} backupName The name for your backup now-ui.json file
 */
const backupAndChangeNowUIJson = async (nowUIJson, backupName) => {
	// Create a backup file with the original json data
	await createFile(backupName, JSON.stringify(nowUIJson, null, 2));
	// Remove the actions field for each component
	Object.values(nowUIJson.components).forEach(component => {
		component.actions = [];
	});
	// Rewrite the now-ui.json file with the modified json
	await createFile('now-ui.json', JSON.stringify(nowUIJson, null, 2));
};

/**
 * Restores an unmodified version of the now-ui.json from a backup
 * @param {string} backupName the file name of the backup
 */
const restoreNowUIJsonFromBackup = async backupName => {
	// Rewrite the original json object to the now-ui.json file to complete the workaround
	const originalNowUIJson = await getNowUIJson('now-ui-backup.json');
	await createFile('now-ui.json', JSON.stringify(originalNowUIJson, null, 2));
	// Remove the now-ui-backup.json file if we got this far
	fs.unlinkSync(backupName);
};

/**
 * Recursive function that will duplicate a folder structure into a JSZip folder object
 * @param {string} folderPath The current folder path
 * @param {JSZip} parentZipFolder The 'parent' zip folder on the current run
 */
const addFolderToZip = (folderPath, parentZipFolder) => {
	// Read all of the contents of the current folder
	const files = fs.readdirSync(folderPath);

	// Loop through contents
	for (const file of files) {
		const filePath = path.join(folderPath, file);
		const fileStats = fs.statSync(filePath);

		if (fileStats.isFile()) {
			// Check if the current item is a file, if so then add it to the current folder in the zip
			const fileContent = fs.readFileSync(filePath);
			parentZipFolder.file(file, fileContent);
		} else if (fileStats.isDirectory()) {
			// Check if the current item is a folder, if so check to see if it is a folder we want to add
			if (
				!file.includes('node_modules') &&
				!file.includes('.now-cli') &&
				!file.includes('target')
			) {
				// Create a new zip subfolder in the parent folder
				const subFolder = parentZipFolder.folder(file);

				// Recursively call the function with the current folder as the next call's parentFolder
				addFolderToZip(filePath, subFolder);
			}
		}
	}
};

/**
 * Gets a name for a zip copy of the project and then creates the zip file a folder level above the project
 * @returns The name of the zip file for the project
 */
const saveProjectLocal = async () => {
	const curPathDirs = process.cwd().split(path.sep);
	const projectDirName = curPathDirs[curPathDirs.length - 1];
	console.log(projectDirName);

	const { template } = await prompt({
		name: 'template',
		type: 'snippet',
		message: 'What would you like to call your zipped project?',
		fields: [
			{
				name: 'filename',
				validate: value => {
					const pattern = /^[a-zA-Z0-9_\-]+$/;
					if (!pattern.test(value.filename))
						return 'Invalid filename';
					return true;
				},
				initial: projectDirName
			}
		],
		template: `\${filename}.zip`
	});
	const filename = template.values.filename;

	const zipSpinner = ora(
		chalk.blue(`Creating '${template.result}', this may take a few moments`)
	).start();

	try {
		const zip = new JSZip();
		zip.folder(filename);
		addFolderToZip('./', zip);

		const zippedContents = await zip.generateAsync({ type: 'nodebuffer' });
		fs.writeFileSync(`../${filename}.zip`, zippedContents);

		zipSpinner.succeed(chalk.green(`${template.result} created`));
		return template.result;
	} catch (error) {
		zipSpinner.fail(chalk.red(`Failed to create '${template.result}'`));
		throw error;
	}
};

/**
 * Prompts a user for their profile password
 * @param {string} profile The profile that the user is inputing a password for
 * @returns string containing the users password for the given profile
 */
const getPassword = async profile => {
	console.log(
		chalk.blue(
			`\nEnter the password for your '${profile}' profile to save a copy of your project to the instance`
		)
	);
	const { password } = await prompt({
		name: 'password',
		type: 'password',
		message: 'Password:',
		required: true
	});
	return password;
};

/**
 * Uploads a zip file of the project contents to the application file for the project scope on an SN instance
 * @param {string} profile The profile to use
 * @param {string} projectZip The name of the local zip file to upload to the instance
 */
const saveToInstance = async (profile, projectZip) => {
	// Read the now-ui.json to get the app scope
	const { scopeName } = await getNowUIJson('now-ui.json');
	const table = 'sys_app';

	// Get the url for the host based off the profile they picked
	const profilesJson = await getProfilesJson();
	const hostUrl = profilesJson[profile].host;
	const username = profilesJson[profile].username;

	// Get credentials from user to communicate with the SN instance
	const password = await getPassword(profile);

	const saveSpinner = ora(
		chalk.blue(`Saving '${projectZip}' to '${hostUrl}'`)
	).start();

	try {
		const headers = {
			Accept: 'application/json',
			Authorization: `Basic ${Buffer.from(
				username + ':' + password
			).toString('base64')}`
		};

		// Send a request using the table api to get the sys_id of the project scope record
		const appRecordRes = await axios
			.get(`${hostUrl}/api/now/table/${table}?scope=${scopeName}`, {
				headers: headers
			})
			.catch(e => {
				e.message = `Error while getting app record - ${e.response.data.error.message}. ${e.message}`;
				throw e;
			});
		const appRecordSysID = appRecordRes.data.result[0].sys_id;

		if (!appRecordSysID)
			throw new Error(
				`Error while finding project's app record, response data: ${JSON.stringify(
					appRecordRes.data
				)}`
			);

		// Clear out old versions of the attachment if there are any
		const existingAttachGet = await axios
			.get(
				`${hostUrl}/api/now/attachment?table_sys_id=${appRecordSysID}`,
				{ headers: headers }
			)
			.catch(e => {
				e.message = `Error while getting existing attachments - ${e.response.data.error.message}. ${e.message}`;
				throw e;
			});
		const existingAttachments = existingAttachGet.data.result;

		if (existingAttachments.length > 0) {
			for (const attachment of existingAttachments) {
				// A copy or copies of the attachment already exists, loop through and delete them
				if (attachment.file_name == projectZip) {
					const attachmentDeleteRes = await axios
						.delete(
							`${hostUrl}/api/now/attachment/${attachment.sys_id}`,
							{ headers: headers }
						)
						.catch(e => {
							e.message = `Error while deleting attachment - ${e.response.data.error.message}. ${e.message}`;
							throw e;
						});
				}
			}
		}

		const formData = new FormData();
		formData.append('table_name', table);
		formData.append('table_sys_id', appRecordSysID);
		formData.append('file', fs.createReadStream(`../${projectZip}`));

		const longRequest = axios.create({ timeout: 240000 });
		const attachPostRes = await longRequest
			.post(`${hostUrl}/api/now/attachment/upload`, formData, {
				headers: {
					...headers,
					'Content-Type': 'multipart/form-data'
				}
			})
			.catch(e => {
				e.message = `Error while attaching zip file - ${e.response.data.error.message}. ${e.message}`;
				throw e;
			});
		saveSpinner.succeed(chalk.green(`${projectZip} saved to ${hostUrl}`));
	} catch (error) {
		saveSpinner.fail(chalk.red('Error while saving to instance'));
		throw error;
	}
};

/**
 * Asks the user if they want to save a zip of their code locally and on an instance.
 * If they say yes, then carries out the local and instance saves
 * @param {string} profile The profile to use
 * @returns
 */
const storeCode = async profile => {
	// See if the user wants to store the code
	printHeader('Save Project');
	const { saveCode } = await prompt({
		name: 'saveCode',
		type: 'confirm',
		message:
			'Would you like to save a zip of this project locally and on the instance?',
		initial: 'true'
	});
	if (!saveCode) return;

	// Create a zip of the project and store it locally
	const projectZip = await saveProjectLocal();

	// Save the zipped project to the instance
	await saveToInstance(profile, projectZip);
};

/**
 * Main function for the 'yala deploy' command
 * @param {boolean} debugMode boolean indicating if debug mode is on
 * @param {boolean} forceDeploy boolean indicating if the deploy should be forced
 */
const yalaDeploy = async (debugMode, forceDeploy) => {
	try {
		const nodeVersion = await checkNodeVersion();
		if (!nodeVersion)
			throw Error('Running an incompatible node.js version');

		const originalNowUIJson = await getNowUIJson('now-ui.json');

		if (nodeVersion == '12.16.1') {
			// IMPORTANT: This is a workaround for a bug where the now-ui.json doesn't recognize the actions field at the component level when using the old Now CLI
			// Create a backup of the now-ui.json and remove the actions field from each component in the json object so the deploy will work
			const backupName = 'now-ui-backup.json';
			await backupAndChangeNowUIJson(originalNowUIJson, backupName);
		}

		// Get the profile they want to deploy to
		printHeader('Select Deploy Profile');
		const profile = await getProfile();

		// Run the SN deploy command
		if ((await runSNDeploy(profile, nodeVersion, forceDeploy)) == false)
			throw new Error('SN Deploy failed');

		if (nodeVersion == '12.16.1') {
			// Complete the workaround by restoring the original version of the now-ui json from the backup
			await restoreNowUIJsonFromBackup(backupName);
		}

		// Save the code
		await storeCode(profile);

		console.log(chalk.green('\n🎉 Deploy successful! 🎉\n'));
	} catch (error) {
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed('\nyala deploy failed\n'));
	}
};

module.exports = {
	yalaDeploy
};
