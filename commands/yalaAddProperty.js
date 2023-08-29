const enquirer = require('enquirer');
const { prompt } = enquirer;
const chalk = require('chalk');
const {
	getNowUIJson,
	selectComponentFromNowUIJson,
	createFile,
	getFieldTypes
} = require('../utils/utilities');
const ora = require('ora');
const { log } = require('../utils/log.js');

/**
 * Prompts user for details to build a new property object
 * @param {[object]} existingProperties A list of existing property objects
 * @returns a new property object
 */
const createPropertyObject = async existingProperties => {
	// Prompt the user for the property details
	const fieldTypes = getFieldTypes();
	const property = await prompt([
		{
			name: 'name',
			type: 'input',
			message: 'Property name:',
			required: true,
			validate: value => {
				let propertyExists = false;
				let message = '';
				existingProperties.forEach(curProperty => {
					if (curProperty.name == value) {
						propertyExists = true;
						message = `Property ${value} already exists for this component\n${JSON.stringify(
							curProperty,
							null,
							2
						)}`;
					}
				});

				if (propertyExists) {
					return message;
				}

				if (value == '') return 'Name required';
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
			name: 'required',
			type: 'confirm',
			message: 'Property required:',
			required: true,
			initial: false
		},
		{
			name: 'readOnly',
			type: 'confirm',
			message: 'Property read-only:',
			required: true,
			initial: false
		},
		{
			name: 'description',
			type: '',
			message: 'Property description:',
			required: true
		},
		{
			name: 'fieldType',
			type: 'autocomplete',
			message: 'Property field type:',
			required: true,
			choices: fieldTypes
		},
		{
			name: 'defaultValue',
			type: 'input',
			message: 'Property default value:',
			required: false
		}
	]);

	if (!property.defaultValue) delete property.defaultValue;

	return property;
};

/**
 * The main function for the 'yalaAddProperty' command
 * @param {boolean} debugMode boolean indicating if debug mode is on
 * @returns
 */
const yalaAddProperty = async debugMode => {
	try {
		// Get the component to add the property to
		const nowUIJson = await getNowUIJson('now-ui.json');
		const component = await selectComponentFromNowUIJson(
			nowUIJson,
			'Select a component to add a property to:'
		);
		if (!component) {
			console.log(
				chalk.yellow(
					"There aren't any components to add a property to\n"
				)
			);
		}

		// Create a property object
		if (!nowUIJson.components[component].properties)
			nowUIJson.components[component].properties = [];
		const existingProperties = nowUIJson.components[component].properties;
		const property = await createPropertyObject(existingProperties);

		// Start the spinner
		const addPropertySpinner = ora(chalk.blue('Adding property')).start();

		// Add the property to the nowUIJson if its not already there
		let propertyExists = false;
		existingProperties.forEach(curProperty => {
			if (curProperty.name == property.name) {
				propertyExists = true;
			}
		});

		if (propertyExists) {
			addPropertySpinner.fail(
				chalk.red(
					`Property ${property.name} already exists for ${component}, add property aborted\n`
				)
			);
			return;
		}
		nowUIJson.components[component].properties.push(property);

		// Update the now-ui.json file
		await createFile('now-ui.json', JSON.stringify(nowUIJson, null, 2));

		// Add property complete
		addPropertySpinner.succeed(
			chalk.green(`Property ${property.name} successfully added\n`)
		);
	} catch (error) {
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed('\nyala add-property failed\n'));
	}
};

module.exports = {
	yalaAddProperty
};
