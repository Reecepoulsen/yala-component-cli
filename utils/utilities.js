const chalk = require('chalk');
const { spawn } = require('child_process');
const ora = require('ora');
const fs = require('fs').promises;
const enquirer = require('enquirer');
const { prompt } = enquirer;

/**
 * Utility function: Logs a header to the console using a standard format
 * @param {string} text Text string to display in the header
 */
const printHeader = text => {
	console.log(chalk.bgBlue(`\n- ${text} -`));
};

/**
 * Utility function: Creates a directory or path of directories
 * @param {string} name The name or path of the directory you wish to create
 */
const createFolder = async name => {
	await fs.mkdir(name, { recursive: true });
};

/**
 * Utility function: Creates a file with the specified name or name + path and contents
 * @param {string} fileName The name or path + name of the file you would like to create
 * @param {string} contents The contents for the file
 */
const createFile = async (fileName, contents) => {
	// Use fs module to create a new file
	await fs.writeFile(fileName, contents);
};

/**
 * Utility function: Checks the version of node being run. Logs some helpful info if running an unsupported node version
 * @returns String with the current running version of node, false if its an unsupported version
 */
const checkNodeVersion = async () => {
	let nodeVCorrect = false;

	const nodeVSpinner = ora(chalk.blue('Checking node version')).start();

	const commandPromise = new Promise((resolve, reject) => {
		// Spawn a child process to run the 'node --version' command
		const nodeVCommand = spawn('node', ['--version']);
		nodeVCommand.stdout.on('data', output => {
			// If the output doesn't contain v12.16.1 or v14.0.0 then the wrong version of node is being used
			if (output.includes('v12.16.1')) {
				nodeVCorrect = '12.16.1';
			} else if (output.includes('v14.21.3')) {
				nodeVCorrect = '14.21.3';
			}
		});

		// If there is an error while running the node --version command then something is really messed up
		nodeVCommand.stderr.on('data', e => {
			nodeVCorrect = false;
		});

		nodeVCommand.on('close', code => {
			resolve(nodeVCorrect);
		});
	});

	nodeVCorrect = await commandPromise;

	// Handle success/failure
	if (nodeVCorrect) {
		nodeVSpinner.succeed(
			chalk.green('Running compatible version of Node.js')
		);
	} else {
		nodeVSpinner.fail(chalk.red('Running incompatible version of node'));

		console.log(
			chalk.red(
				`In order to use the Now CLI you must be running node v12.16.1 or v14.21.3`
			)
		);

		// Log the link to install the Now CLI
		console.log(
			chalk.yellow(
				`Check the node versions you have installed by running 'nvm list'\n` +
					`If v12.16.1 or v14.21.3 is installed then switch node versions by running 'nvm use <version_num_here>'\n` +
					`If you don't have node v12.16.1 or v14.21.3 installed, then download one of them here:\n` +
					`https://nodejs.org/ru/blog/release/v12.16.1\n` +
					`https://nodejs.org/en/blog/release/v14.21.3\n` +
					`Once downloaded, run 'nvm install <version_num_here>' to finish the installation`
			)
		);
	}
	return nodeVCorrect;
};

/**
 * Utility function: Gets the contents of now-ui.json and returns it as a json object.
 * Throws an error if unable to locate the file at the specified path
 * @param {string} nowUIJsonPath the path to the now-ui.json file
 * @returns json object containing the contents of the now-ui.json file
 */
const getNowUIJson = async nowUIJsonPath => {
	// Read the 'now-ui.json' file and parse it to json so it can be changed
	try {
		const nowUIJson = JSON.parse(
			await fs.readFile(nowUIJsonPath, {
				encoding: 'utf-8'
			})
		);
		return nowUIJson;
	} catch (e) {
		throw new Error('Unable to locate now-ui.json. ' + e.message);
	}
};

/**
 * Utility function: Prompts the user to select a component from the list of components in the now-ui.json
 * and returns their choice
 * @param {object} nowUIJson The nowUIJson object
 * @param {string} message A message to print when prompting the user to select a component
 * @returns returns the string key of the selected component
 */
const selectComponentFromNowUIJson = async (nowUIJson, message) => {
	// If there aren't any components to select then return false
	const components = Object.keys(nowUIJson.components);
	if (components.length <= 0) return false;

	const { component } = await prompt({
		name: 'component',
		type: 'select',
		message: message,
		choices: components
	});

	return component;
};

/**
 * Utility function: Returns a hard coded list of field types that are viable for component properties in UI Builder
 * @returns A list of fieldType strings
 */
const getFieldTypes = () => {
	const fieldTypes = [
		'choice',
		'condition_string',
		'field',
		'field_list',
		'html',
		'icon',
		'list',
		'string',
		'table_name',
		'reference',
		'json',
		'number',
		'css',
		'url'
	];
	return fieldTypes;
};

/**
 * Utility function: Runs the 'snc configure profile list' command and returns the json object it outputs
 * @returns An object containing the profile data
 */
const getProfilesJson = async () => {
	try {
		// Create a promise that will wait until the command is finished
		const commandPromise = new Promise((resolve, reject) => {
			// Run the 'snc configure profile list' command to get a json obj of already configured profiles
			const listProfilesCommand = spawn('snc', [
				'configure',
				'profile',
				'list'
			]);

			// When we receive the output convert it to json and resolve the promise with a list of the keys (profiles) so they are returned
			listProfilesCommand.stdout.on('data', output => {
				const profilesJson = JSON.parse(output);
				resolve(profilesJson);
			});

			// If there is an error while running the command, log the error and reject the promise
			listProfilesCommand.stderr.on('data', e => {
				console.log(
					chalk.red(`Unable to get existing profiles, error: ${e}`)
				);
				reject();
			});
		});

		return commandPromise;
	} catch (error) {
		console.log(
			chalk.red(
				`Error while getting SN instance profiles: ${error.message}`
			)
		);
		// Return an empty object
		return {};
	}
};

/**
 * Utility function: Prompts the user for a new profile name and then runs the 'snc configure profile set' command
 * returns the name of the profile after its created and set
 * @returns A string for the name of the newly created profile
 */
const createProfile = async () => {
	// Get the new profile name from the user
	const { profile } = await prompt({
		name: 'profile',
		type: 'input',
		message: 'New profile name:',
		required: true
	});

	// Create a promise to return, this promise will be resolved when the 'snc configure profile set' command finishes
	const commandPromise = new Promise((resolve, reject) => {
		// Spawn a child process to run the 'snc configure profile set' command, this process will use the parent's input and output streams but have its own error stream
		const configureProfileSet = spawn(
			'snc',
			['configure', 'profile', 'set', '--profile', profile],
			{
				stdio: [0, 0, 'pipe']
			}
		);

		configureProfileSet.on('close', code => {
			// resolve the promise
			resolve(profile);
		});

		configureProfileSet.stderr.on('data', data => {
			console.log(chalk.red(`Error while setting profile ${e}`));
			reject(false);
		});
	});

	return commandPromise;
};

/**
 * Utility function: Prompts the user to select an existing profile or create one.
 * @returns A string for the name of the selected profile
 */
const getProfile = async () => {
	// Get a list of existing profiles
	const profilesJson = await getProfilesJson();
	const existingProfiles = Object.keys(profilesJson);

	let { profile } = await prompt({
		name: 'profile',
		type: 'select',
		message: 'Select the profile you would like to use:',
		choices: [...existingProfiles, 'Create a new profile']
	});

	if (profile == 'Create a new profile') {
		profile = await createProfile();
	}

	return profile;
};

const addUIExtension = async () => {
	const installSpinner = ora(
		chalk.blue('Adding ui-component extension, this may take a few moments')
	).start();
	let commandSuccess = true;
	const commandPromise = new Promise((resolve, reject) => {
		const addUIExtension = spawn('snc', [
			'extension',
			'add',
			'--name',
			'ui-component'
		]);
		addUIExtension.on('error', e => (commandSuccess = false));
		addUIExtension.on('close', code => resolve(commandSuccess));
	});

	commandSuccess = await commandPromise;
	if (commandSuccess) {
		installSpinner.succeed(chalk.green('ui-component extension added'));
	} else {
		installSpinner.fail(
			chalk.red(
				"Unable to automatically add ui-component extension, add the extension manually by running 'snc extension add --name ui-component'"
			)
		);
	}

	return commandSuccess;
};

/**
 * Utility function: Runs the 'snc --help' command to test if the Now CLI is installed
 * @returns boolean indicating if the Now CLI is installed
 */
const checkNowCLI = async () => {
	let nowCliInstalled = true;

	// Create a spinner and start it
	const cliCheckSpinner = ora(
		chalk.blue('Checking to see if the Now CLI is installed')
	).start();

	const commandPromise = new Promise((resolve, reject) => {
		// spawn a child process to run the 'snc --help' command
		const sncHelp = spawn('snc', ['--help']);
		sncHelp.on('error', e => (nowCliInstalled = false));

		sncHelp.on('close', code => resolve(nowCliInstalled));
	});

	nowCliInstalled = await commandPromise;

	if (nowCliInstalled) {
		let uiExtensionInstalled = true;
		const checkUIExtensionCommand = new Promise((resolve, reject) => {
			const uiExtensionHelp = spawn('snc', ['ui-component', 'help']);
			uiExtensionHelp.on('error', e => (uiExtensionInstalled = false));
			uiExtensionHelp.stderr.on(
				'data',
				e => (uiExtensionInstalled = false)
			);

			uiExtensionHelp.on('close', code => resolve(uiExtensionInstalled));
		});

		uiExtensionInstalled = await checkUIExtensionCommand;
		if (!uiExtensionInstalled) {
			cliCheckSpinner.warn(
				chalk.yellow(
					"Now CLI installed, but the ui-component extension isn't"
				)
			);
			if (!(await addUIExtension()))
				throw new Error('Failed to add ui-component extension');
		}

		// Now CLI is installed, stop the spinner with a green success message
		cliCheckSpinner.succeed(
			chalk.green('Now CLI and ui-component extension installed')
		);
	} else {
		// Now CLI is not installed, stop the spinner with a red fail message
		cliCheckSpinner.fail(chalk.red('Now CLI not installed'));

		// Log that the Now CLI is required
		console.log(
			chalk.red(
				`In order to use the Yansa Labs Component CLI you must have the Now CLI and its ui-component extension installed`
			)
		);

		// Log the link to install the Now CLI
		console.log(
			chalk.yellow(
				`Install the Now CLI here: https://store.servicenow.com/sn_appstore_store.do#!/store/application/9085854adbb52810122156a8dc961910\n`
			)
		);
	}

	// return whether or not the Now CLI is installed
	return nowCliInstalled;
};

module.exports = {
	printHeader,
	createFolder,
	createFile,
	checkNodeVersion,
	getNowUIJson,
	selectComponentFromNowUIJson,
	getFieldTypes,
	getProfilesJson,
	getProfile,
	checkNowCLI
};
