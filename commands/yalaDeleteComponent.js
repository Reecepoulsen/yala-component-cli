const enquirer = require('enquirer');
const { prompt } = enquirer;
const chalk = require('chalk');
const fs = require('fs');
const {
	selectComponentFromNowUIJson,
	getNowUIJson,
	createFile
} = require('../utils/utilities');
const ora = require('ora');
const { log } = require('../utils/log.js');

/**
 * Main function for the 'yala delete-component' command
 * @param {boolean} debugMode boolean indicating if debug mode is on
 * @returns
 */
const yalaDeleteComponent = async debugMode => {
	try {
		// Switch to the source directory
		process.chdir('src');

		// First select the component to be deleted
		const nowUIJson = await getNowUIJson('../now-ui.json');
		const component = await selectComponentFromNowUIJson(
			nowUIJson,
			'Select a component to delete'
		);
		if (!component) {
			console.log(
				chalk.yellow("There aren't any components to delete\n")
			);
			return;
		}

		// Confirm that they want to delete this component
		const { deleteConfirmed } = await prompt({
			name: 'deleteConfirmed',
			type: 'confirm',
			message: chalk.bgYellow(
				`Are you sure that you want to delete ${component}?`
			)
		});

		// Create spinner to show the status of the delete
		const deleteSpinner = ora(chalk.blue('Deleting component'));

		// Abort the delete if it is not confirmed
		if (!deleteConfirmed) {
			deleteSpinner.fail(chalk.red('Delete aborted\n'));
			return;
		}

		// Delete the component folder
		fs.rmdirSync(`${component}`, { recursive: true });

		// Delete the entry in now-ui.json
		delete nowUIJson.components[component];
		await createFile('../now-ui.json', JSON.stringify(nowUIJson, null, 2));

		// Delete references in src/index.js
		const indexContents = fs
			.readFileSync('index.js', { encoding: 'utf-8' })
			.split('\n');
		const newIndexContents = indexContents
			.filter(line => !line.includes(component))
			.join('\n');
		await createFile('index.js', newIndexContents);

		// Delete references in example > element.js
		const elementContents = fs
			.readFileSync('../example/element.js', { encoding: 'utf-8' })
			.split('\n');
		const newElementContents = elementContents
			.filter(line => !line.includes(component))
			.join('\n');
		await createFile('../example/element.js', newElementContents);

		// Delete complete
		deleteSpinner.succeed(chalk.green('Component successfully deleted\n'));
		console.log(
			chalk.yellow(`References to your component have been removed from src/index.js, example/element.js, and now-ui.json.
Make sure to clean up other references throughout your project if there are any.`)
		);
	} catch (error) {
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed('\nyala delete-component failed\n'));
	}
};

module.exports = {
	yalaDeleteComponent
};
