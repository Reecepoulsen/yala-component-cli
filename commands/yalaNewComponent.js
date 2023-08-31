const enquirer = require('enquirer');
const { prompt } = enquirer;
const chalk = require('chalk');
const { spawn } = require('child_process');
const process = require('process');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('../utils/log.js');
const {
	createFile,
	createFolder,
	getNowUIJson
} = require('../utils/utilities.js');

// Import helpers
const {
	getActionHandlerTemplate
} = require('../helpers/getActionHandlerTemplate.js');
const { getIndexTemplate } = require('../helpers/getIndexTemplate.js');
const { getStylesTemplate } = require('../helpers/getStylesTemplate.js');
const { getComponentTemplate } = require('../helpers/getComponentTemplate.js');

/**
 * Checks to see if we are currently in the 'src' directory
 * @returns boolean indicating if currently in 'src' directory
 */
const checkSrcDirectory = async () => {
	let inSrc = false;
	const pwdCommandPromise = new Promise((resolve, reject) => {
		const pwdCommand = spawn('pwd', []);

		pwdCommand.stderr.on('data', error => console.log(`${error}`));

		pwdCommand.stdout.on('data', output => {
			// String any newline chars from the path string
			output = output.toString();
			const path = output.replace(/[\r\n]/gm, '');

			// Check to see if it is a mac/linux or windows path
			if (path.includes('/')) {
				// Mac or linux
				// Check the name of the last directory
				const directories = path.split('/');
				const lastDirIndex = directories.length - 1;
				const lastDir = directories[lastDirIndex];
				if (lastDir == 'src') inSrc = true;
			} else {
				// Windows
				// Check the name of the last directory
				const directories = path.split('\\');
				const lastDirIndex = directories.length - 1;
				const lastDir = directories[lastDirIndex];
				if (lastDir == 'src') inSrc = true;
			}
		});

		pwdCommand.on('close', code => {
			resolve(inSrc);
		});
	});

	inSrc = await pwdCommandPromise;

	if (!inSrc) {
		console.log(
			chalk.red(
				"You must be in the 'src' directory in order to run the 'yala create-component' command\n" +
					"Please navigate to the 'src' directory and then try again"
			)
		);
	}

	return inSrc;
};

/**
 * Prompts the user for the type of component they want to create
 * @returns a string indicating the component type
 */
const getComponentType = async () => {
	const { componentType } = await prompt({
		name: 'componentType',
		type: 'select',
		message: 'What type of component do you want to create?',
		choices: ['Deployed component', 'Inner component']
	});

	return componentType;
};

/**
 * Checks the parent folder to see if a component with the given name already exists
 * @param {string} parentFolder The path to the parent folder
 * @param {string} componentName the name of the component to search for
 * @returns boolean indicating if the component exists
 */
const componentExists = async (parentFolder, componentName) => {
	const filePath = path.resolve(parentFolder, componentName);
	try {
		await fs.access(filePath);
		return true;
	} catch (error) {
		return false;
	}
};

/**
 * Gets the instance id from the now-ui.json file
 * @returns string of the instance ID
 */
const getInstanceID = async () => {
	const nowUIJson = await getNowUIJson('../now-ui.json');

	// Get the scopeName field
	const scopeName = nowUIJson.scopeName;

	// Split the string by "_"
	// The second element in the list is the instance ID
	const instanceID = scopeName.split('_')[1];
	return instanceID;
};

/**
 * Prompts the user for the name of the new comopnent
 * @returns string containing the name of the component
 */
const getComponentName = async () => {
	const instanceID = await getInstanceID();

	const {
		name: { values, result }
	} = await prompt({
		name: 'name',
		type: 'snippet',
		message: 'What would you like to name your new component?',
		required: true,
		fields: [
			{
				name: 'componentName',
				message: 'component-name',
				validate: async value => {
					if (value.includes(' ')) {
						return 'The component name cannot contain spaces';
					}

					if (!value.includes('-')) {
						return "Component names must include a ' - ' character";
					}
					return true;
				}
			}
		],
		template: `x-${instanceID}-\${componentName}`,
		validate: async ({ result }) => {
			// Check to see if there is already a component with that name for both of the possible directories
			if (
				(await componentExists('', result)) ||
				(await componentExists('inner-components', result))
			) {
				return 'A component with that name already exists';
			}
			return true;
		}
	});
	return result;
};

/**
 * Prompts the user for the component label
 * @returns string of the component label
 */
const getComponentLabel = async () => {
	const { label } = await prompt({
		name: 'label',
		type: 'input',
		message: 'What do you want your component to be labeled in UI Builder?'
	});
	return label;
};

/**
 * Prompts the user for the component description
 * @returns string of the component description
 */
const getComponentDescription = async () => {
	const { desc } = await prompt({
		name: 'desc',
		type: 'input',
		message: 'Give a brief description of your component:',
		required: true
	});

	return desc;
};

/**
 * Creates a new folder for the component in the src directory and then adds template files:
 * - actionHandlers.js
 * - index.js
 * - <component_name>.js
 * - styles.scss
 * to the new component folder.
 * @param {string} componentName The name of the new component to create
 * @param {string} type The type of component to create. Either 'Deployed Component' or 'Inner Component'
 */
const createComponentFiles = async (componentName, type) => {
	// Create a deployed-components or inner-components folder if they don't already exist
	let typeDir = '';
	if (type == 'Deployed component') {
		typeDir = '';
	} else {
		typeDir = 'inner-components';
		await createFolder(typeDir);
	}

	// Create a component folder in the correct component type folder
	await createFolder(path.resolve(typeDir, componentName));

	// Create actionHandlers.js
	const actionHandlerTemplate = getActionHandlerTemplate();
	await createFile(
		path.resolve(typeDir, componentName, 'actionHandlers.js'),
		actionHandlerTemplate
	);

	// Create index.js
	const indexTemplate = getIndexTemplate(componentName);
	await createFile(
		path.resolve(typeDir, componentName, 'index.js'),
		indexTemplate
	);

	// Create <component-name>.js
	const componentTemplate = getComponentTemplate(componentName);
	await createFile(
		path.resolve(typeDir, componentName, `${componentName}.js`),
		componentTemplate
	);

	// Create styles.scss
	const stylesTemplate = getStylesTemplate();
	await createFile(
		path.resolve(typeDir, componentName, 'styles.scss'),
		stylesTemplate
	);
};

/**
 * Adds the newly created components object to the now-ui.json file
 * @param {string} name component name
 * @param {string} label component label
 * @param {string} desc component description
 */
const addComponentToNowUIJson = async (name, label, desc) => {
	// Get the now-ui.json file's json contents
	const nowUIJsonPath = '../now-ui.json';
	const nowUIJson = await getNowUIJson(nowUIJsonPath);

	// Add an entry to the 'components' in the NowUIJson for the new component if its not already there
	if (!Object.keys(nowUIJson.components).includes(name)) {
		nowUIJson.components[name] = {
			innerComponents: [],
			uiBuilder: {
				associatedTypes: ['global.core', 'global.landing-page'],
				label: label,
				icon: 'document-outline',
				description: desc,
				category: 'primitives'
			},
			properties: [],
			actions: []
		};
	}

	// Overwrite the old 'now-ui.json' with the new json data
	await fs.writeFile(nowUIJsonPath, JSON.stringify(nowUIJson, null, 2));
};

/**
 * The main function for the 'yala create-component' command
 * @param {boolean} debugMode boolean indicating if debug mode is on
 */
const yalaNewComponent = async debugMode => {
	try {
		// Switch to the source directory
		process.chdir('src');

		// Check to make sure that we are in the src directory
		// if ((await checkSrcDirectory()) == false)
		// 	throw new Error('Not in src directory');

		// Inner component or deployed component
		const type = await getComponentType();
		const deployComponent = type == 'Deployed component';

		// Get the new component's name
		const componentName = await getComponentName();

		// If this component is supposed to be deployed
		if (deployComponent) {
			// Get the component label and the component description
			const componentLabel = await getComponentLabel();
			const componentDesc = await getComponentDescription();

			// Add the component import to src > index.js
			await fs.appendFile('index.js', `import './${componentName}';\n`);

			// Modify the example > element.js to include this component
			await fs.appendFile(
				'../example/element.js',
				`el.innerHTML += '<${componentName}></${componentName}>';\n`
			);

			// Add it to the `now-ui.json` file
			await addComponentToNowUIJson(
				componentName,
				componentLabel,
				componentDesc
			);
		}

		// Create a new component folder with template files
		await createComponentFiles(componentName, type);

		console.log(chalk.green('\n🎉 New component created! 🎉\n'));
	} catch (error) {
		console.log(`${error}`);
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed('\nyala create-component failed\n'));
	}
};

module.exports = {
	yalaNewComponent
};
