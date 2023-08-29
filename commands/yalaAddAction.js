const enquirer = require('enquirer');
const { prompt } = enquirer;
const chalk = require('chalk');
const {
	getNowUIJson,
	selectComponentFromNowUIJson,
	createFile
} = require('../utils/utilities');
const ora = require('ora');
const { log } = require('../utils/log.js');

/**
 * Prompts the user for action object details
 * @param {[object]} existingActions A list of existing action objects
 * @returns an action object
 */
const createActionObject = async existingActions => {
	// Get action details from the user
	let { name, label, description, payloadType } = await prompt([
		{
			name: 'name',
			type: 'input',
			message: 'Action name (UPPER_SNAKE_CASED):',
			required: true,
			validate: value => {
				if (value.toUpperCase() != value || value.includes(' ')) {
					return 'Actions must be UPPER_SNAKE_CASED';
				}

				let actionExists = false;
				let message = '';
				existingActions.forEach(curAction => {
					if (curAction.name == value) {
						actionExists = true;
						message = `Action ${value} already exists for this component\n${JSON.stringify(
							curAction,
							null,
							2
						)}`;
					}
				});

				if (actionExists) {
					return message;
				}

				return true;
			}
		},
		{
			name: 'label',
			type: 'input',
			message: 'UI Builder label:',
			required: true
		},
		{
			name: 'description',
			type: 'input',
			message: 'Action description:',
			required: true
		},
		{
			name: 'payloadType',
			type: 'select',
			message: 'Payload type',
			choices: ['Simple Object', 'Advanced (list or nested object)'],
			required: true
		}
	]);

	const payload = {};
	if (payloadType == 'Simple Object') {
		console.log(`\nDefine payload for ${name}`);

		let keepAddingToPayload = true;
		while (keepAddingToPayload) {
			const {
				template: {
					values: { key, value }
				},
				addAnother
			} = await prompt([
				{
					name: 'template',
					type: 'snippet',
					message: `Key-value pair:`,
					required: true,
					fields: [
						{
							name: 'key',
							type: 'input',
							message: 'key',
							required: true
						},
						{
							name: 'value',
							type: 'input',
							message: 'value',
							required: true
						}
					],
					template: `"\${key}": "\${value}"`
				},
				{
					name: 'addAnother',
					type: 'confirm',
					message:
						"Add another key-value pair to this action's payload?",
					required: true,
					initial: 'Yes'
				}
			]);

			payload[key] = value;
			keepAddingToPayload = addAnother;
		}
	} else {
		console.log(
			chalk.yellow(
				`\nDefine the advanced payload for ${name} in your project's 'now-ui.json' file`
			)
		);
	}

	const actionObj = {
		name: name,
		label: label,
		description: description,
		payload: [payload]
	};

	return actionObj;
};

/**
 * The main function for the 'yala add-action' command
 * @param {boolean} debugMode boolean indicating if debug mode is on
 * @returns
 */
const yalaAddAction = async debugMode => {
	try {
		// Get the component to add the action to
		const nowUIJson = await getNowUIJson('now-ui.json');
		const component = await selectComponentFromNowUIJson(
			nowUIJson,
			'Select a component to add an action to:'
		);
		if (!component) {
			console.log(
				chalk.yellow(
					"There aren't any components to add an action to\n"
				)
			);
		}

		// Create an action object
		if (!nowUIJson.components[component].actions)
			nowUIJson.components[component].actions = [];
		const existingActions = nowUIJson.components[component].actions;
		const action = await createActionObject(existingActions);

		// Start the spinner
		const addActionSpinner = ora(chalk.blue('Adding action')).start();

		// Add the action to the nowUIJson if its not already there
		let actionExists = false;
		existingActions.forEach(curAction => {
			if (curAction.name == action.name) {
				actionExists = true;
			}
		});

		if (actionExists) {
			addActionSpinner.fail(
				chalk.red(
					`Action ${action.name} already exists for ${component}, add action aborted\n`
				)
			);
			return;
		}
		nowUIJson.components[component].actions.push(action);

		// Update the now-ui.json file
		await createFile('now-ui.json', JSON.stringify(nowUIJson, null, 2));

		// Add action complete
		addActionSpinner.succeed(
			chalk.green(`Action ${action.name} successfully added\n`)
		);
	} catch (error) {
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed('\nyala add-action failed\n'));
	}
};

module.exports = {
	yalaAddAction
};
