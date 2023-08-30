#!/usr/bin/env node

/**
 * yala-component-cli
 * Yansa Labs' improved CLI solution for ServiceNow custom component development
 *
 * @author Reece Poulsen <https://www.yansalabs.com/>
 */
const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const { init } = require('./utils/init.js');
const { cli } = require('./utils/cli.js');
const { log } = require('./utils/log.js');
const { printHeader } = require('./utils/utilities.js');

// Import command functions
const { yalaSetup } = require('./commands/yalaSetup.js');
const { yalaDevelop } = require('./commands/yalaDevelop.js');
const { yalaDeploy } = require('./commands/yalaDeploy.js');
const { yalaNewComponent } = require('./commands/yalaNewComponent.js');
const { yalaDeleteComponent } = require('./commands/yalaDeleteComponent.js');
const { yalaAddAction } = require('./commands/yalaAddAction.js');
const { yalaAddProperty } = require('./commands/yalaAddProperty.js');
const { yalaCreateXml } = require('./commands/yalaCreateXml.js');

/**
 * This function checks if yala-component-cli needs updated and runs the update if needed
 */
const checkForUpdates = async () => {
	printHeader('Checking for updates');
	const updateSpinner = ora(
		'Checking for yala-component-cli updates'
	).start();

	// run npm view yala-component-cli to check the latest version
	const npmViewCommand = new Promise((resolve, reject) => {
		const npmView = spawn('npm', ['view', 'yala-component-cli', 'version']);
		npmView.stdout.on('data', output => {
			resolve(output.toString());
		});
	});
	const latestVersion = await npmViewCommand;

	// run yala -v to see what is installed
	const yalaVersionCommand = new Promise((resolve, reject) => {
		const yalaVersion = spawn('yala', ['-v']);
		yalaVersion.stdout.on('data', output => {
			resolve(output.toString());
		});
	});
	const curVersion = await yalaVersionCommand;

	if (curVersion != latestVersion) {
		// If an update is needed, run npm update yala-component-cli -g
		updateSpinner.warn(
			chalk.yellow(
				'A new version of yala-component-cli is available, updating now'
			)
		);
		const updateCommand = new Promise((resolve, reject) => {
			const npmUpdate = spawn(
				'npm',
				['update', 'yala-component-cli', '-g'],
				{ stdio: [0, 0, 0] }
			);
			npmUpdate.on('close', code => resolve('ok'));
		});
		await updateCommand;
		updateSpinner.succeed(chalk.green('yala-component-cli updated'));
	} else {
		updateSpinner.succeed(
			chalk.green('Running latest yala-component-cli version')
		);
	}
};

/**
 * Main function for the cli, used to route commands
 */
(async () => {
	const input = cli.input;
	const flags = cli.flags;
	const { clear, debug } = flags;

	// Initialize the CLI and handle help and debug commands
	init({ clear });
	if (debug) {
		log(flags);
		log(input);
	}
	if (input.includes(`help`) || flags.help || input.length == 0) {
		cli.showHelp(0);
		return;
	}

	// Check for updates
	await checkForUpdates();

	// Handle commands
	if (input[0] == 'setup') {
		await yalaSetup(debug);
	} else if (input[0] == 'develop') {
		await yalaDevelop(debug);
	} else if (input[0] == 'deploy') {
		await yalaDeploy(debug, flags.force);
	} else if (input[0] == 'create-component') {
		await yalaNewComponent(debug);
	} else if (input[0] == 'delete-component') {
		await yalaDeleteComponent(debug);
	} else if (input[0] == 'add-action') {
		await yalaAddAction(debug);
	} else if (input[0] == 'add-property') {
		await yalaAddProperty(debug);
	} else if (input[0] == 'create-xml') {
		await yalaCreateXml(debug);
	} else {
		if (input.length > 0) {
			console.log(chalk.red(`Unknown command: ${input.join(' ')}\n`));
		}
		console.log(chalk.blue('Displaying help info'));
		cli.showHelp(0);
	}
})();
