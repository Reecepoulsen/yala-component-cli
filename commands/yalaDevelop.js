const chalk = require('chalk');
const { log } = require('../utils/log.js');
const { spawn } = require('child_process');
const { checkNodeVersion, printHeader } = require('../utils/utilities.js');

/**
 * Runs the 'snc ui-component develop' command
 * @returns
 */
const startDevServer = async () => {
	printHeader('Starting development server');
	let commandSuccess = true;
	const commandPromise = new Promise((resolve, reject) => {
		// Spawn a child process to run the 'snc ui-component develop' command, this child will use the parent's input, output, and error streams
		const developCommand = spawn('snc', ['ui-component', 'develop'], {
			stdio: ['pipe', 'pipe', 0]
		});
		developCommand.stdout.on('data', output =>
			process.stdout.write(`${output}`)
		);

		developCommand.on('error', e => (commandSuccess = false));
		developCommand.on('close', code => resolve(commandSuccess));
	});
	return commandPromise;
};

/**
 * The main function for the 'yala develop' command
 * @param {boolean} debugMode Flag indicating if debug mode is on
 */
const yalaDevelop = async debugMode => {
	try {
		if (!(await checkNodeVersion()))
			throw Error('Running an incompatible node.js version');

		// Check that you are in the base project folder

		await startDevServer();
	} catch (error) {
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed('\nyala develop failed\n'));
	}
};

module.exports = {
	yalaDevelop
};
