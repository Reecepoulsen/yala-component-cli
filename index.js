#!/usr/bin/env node

/**
 * yala-component-cli
 * Yansa Labs' improved CLI solution for ServiceNow custom component development
 *
 * @author Reece Poulsen <https://www.yansalabs.com/>
 */
const chalk = require('chalk');
const { init } = require('./utils/init.js');
const { cli } = require('./utils/cli.js');
const { log } = require('./utils/log.js');

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
 * Main function for the cli, used to route commands
 */
(async () => {
	const input = cli.input;
	const flags = cli.flags;
	const { clear, debug } = flags;

	// Initialize the CLI and handle help and debug commands
	await init({ clear });
	if (debug) {
		log(flags);
		log(input);
	}
	if (input.includes(`help`) || flags.help || input.length == 0) {
		cli.showHelp(0);
		return;
	}

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
