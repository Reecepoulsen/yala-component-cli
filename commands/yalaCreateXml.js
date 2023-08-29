const chalk = require('chalk');
const { log } = require('../utils/log.js');
const { printHeader } = require('../utils/utilities.js');
const { spawn } = require('child_process');

/**
 * Checks the current version of the Now CLI
 * @returns string with the cli version number
 */
const getCLIVersion = async () => {
	const commandPromise = new Promise((resolve, reject) => {
		const command = spawn('snc', ['ui-component', '--version']);
		command.stdout.on('data', output => {
			resolve(output.toString());
		});
	});

	const versionText = await commandPromise;
	const versionNum = versionText.split('@')[1];
	return versionNum;
};

/**
 * Checks to see if the current version of the Now CLI is compatible with the 'yala create-xml' command
 * @returns boolean indicating if the requirements to run this command are met
 */
const checkRequirements = async () => {
	const versionNum = await getCLIVersion();
	const leadingNum = versionNum.split('.')[0];
	if (leadingNum < 24) {
		console.log(
			chalk.red(
				'You must have Now CLI v24 or greater installed to run this command'
			)
		);
		return false;
	}
	return true;
};

/**
 * Runs the 'snc ui-component generate-update-set' command
 * @returns boolean indicating if the update set was created
 */
const createUpdateSet = async () => {
	printHeader('Creating Update Set');

	let commandSuccess = true;
	const commandPromise = new Promise((resolve, reject) => {
		const command = spawn('snc', ['ui-component', 'generate-update-set'], {
			stdio: [0, 'pipe', 0]
		});

		command.stdout.on('data', output => {
			if (output.toString().includes('Generation of updateSet failed')) {
				commandSuccess = false;
				console.log(chalk.red(output.toString()));
			} else {
				console.log(output.toString());
			}
		});

		command.on('close', code => {
			resolve(commandSuccess);
		});
	});

	return await commandPromise;
};

/**
 * The main function for the 'yala create-xml' command
 * @param {boolean} debugMode boolean indicating if debug mode is on
 */
const yalaCreateXml = async debugMode => {
	try {
		if (!(await checkRequirements()))
			throw new Error('Requirements to run this command are not met');

		if (!(await createUpdateSet()))
			throw new Error('Error while creating update set');

		console.log(
			chalk.green(
				'\n🎉 Update Set XML successfully created for this project 🎉\n'
			)
		);
	} catch (error) {
		if (debugMode) log(chalk.red(`Debug: ${error}`));
		console.log(chalk.bgRed('\nyalaCreateXml failed\n'));
	}
};

module.exports = {
	yalaCreateXml
};
