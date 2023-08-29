const enquirer = require('enquirer');
const { prompt } = enquirer;
const chalk = require('chalk');
const process = require('process');
const { spawn } = require('child_process');
const ora = require('ora');
const fs = require('fs');
const { log } = require('../utils/log.js');
const {
	checkNodeVersion,
	createFolder,
	createFile,
	printHeader,
	getProfile
} = require('../utils/utilities.js');

/**
 * Checks the contents of the current folder to see if it is empty or not
 * @returns A boolean of whether the current folder is empty
 */
const checkFolder = async () => {
	const folderSpinner = ora(
		chalk.blue('Checking if current folder is empty')
	).start();

	let folderEmpty = true;
	const commandPromise = new Promise(async (resolve, reject) => {
		// Spawn a child process to run the 'pwd' command to get the present directory and check if its empty
		const pwd = spawn('pwd', []);

		pwd.stdout.on('data', output => {
			output = output.toString();
			const path = output.replace(/[\r\n]/gm, '');
			folderEmpty = fs.readdirSync(path).length == 0;
		});

		pwd.on('close', code => {
			resolve(folderEmpty);
		});
	});

	folderEmpty = await commandPromise;

	if (folderEmpty) {
		folderSpinner.succeed(chalk.green('Current folder empty'));
	} else {
		folderSpinner.fail(chalk.red('Current folder not empty'));
		console.log(
			chalk.red(
				'Your current folder must be empty in order to setup a new component project. Create a componet folder and then switch to that directory.'
			)
		);
	}
	return folderEmpty;
};

/**
 * Runs the 'snc --help' command to test if the Now CLI is installed
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
		sncHelp.stderr.on('data', data => {
			// if there is data sent to the error stream then the cli is not installed
			nowCliInstalled = false;
		});

		sncHelp.on('close', code => {
			resolve(nowCliInstalled);
		});
	});

	nowCliInstalled = await commandPromise;

	if (nowCliInstalled) {
		// Now CLI is installed, stop the spinner with a green success message
		cliCheckSpinner.succeed(chalk.green('Now CLI installed'));
	} else {
		// Now CLI is not installed, stop the spinner with a red fail message
		cliCheckSpinner.fail(chalk.red('Now CLI not installed'));

		// Log that the Now CLI is required
		console.log(
			chalk.red(
				`In order to use the Yansa Labs Component CLI you must have the Now CLI installed`
			)
		);

		// Log the link to install the Now CLI
		console.log(
			chalk.yellow(
				`Install the Now CLI here: https://store.servicenow.com/sn_appstore_store.do#!/store/application/9085854adbb52810122156a8dc961910`
			)
		);
	}

	// return whether or not the Now CLI is installed
	return nowCliInstalled;
};

/**
 * Runs through some checks to see if the current environment meets the requirements to run this command
 * @returns boolean indicating if all requirements were met
 */
const checkRequirements = async () => {
	printHeader('Checking requirements');

	// Node version 12.16.1 or 14.23.1 is being used
	if ((await checkNodeVersion()) == false) return false;

	// Now CLI installed
	if ((await checkNowCLI()) == false) return false;

	// The current folder needs to be empty to setup a new component project
	// if ((await checkFolder()) == false) return false;

	return true;
};

/**
 * Prompts the user for some details, creates a folder for the project, switches to that folder,
 * and then runs the 'snc ui-component project' command with the appropriate project, scope, and, name flags
 * @param {string} profile The name of the profile to use for the project
 * @returns boolean indicating if the project was created
 */
const createProject = async profile => {
	printHeader('Create project');

	// Prompt to collect the project name and scope to use for the project
	const { name, scope } = await prompt([
		{
			name: 'scope',
			type: 'input',
			message: 'What scope do you want to create/use for your project?',
			required: true,
			validate: value => {
				if (value.length > 18) {
					return 'Scopes must be shorter than 18 characters';
				}

				const pattern = /^[a-z0-9_]*$/;
				if (!pattern.test) {
					return 'Scope names muse be lowercased letters, numbers, or underscores';
				}
				return true;
			}
		},
		{
			name: 'name',
			type: 'input',
			message:
				'Enter the name of the application that this component project should be connected to:',
			required: true,
			validate: value => {
				const pattern = /^[a-z0-9-]*$/;
				if (!pattern.test(value)) {
					return 'Application names can only contain lowercased letters, numbers, and hyphens';
				}
				return true;
			}
		}
	]);

	// Create a folder for the component project and switch to that folder
	await createFolder(`${name}-components`);
	process.chdir(`${name}-components`);

	const commandPromise = new Promise(async (resolve, reject) => {
		console.log(chalk.blue('\nBuilding project'));
		// Spawn a child process to run the 'snc ui-component project --name <proj_name> --scope <scope>' command
		// This child will use the parent's input, output, and error streams
		const createProject = spawn(
			'snc',
			[
				'ui-component',
				'project',
				'--profile',
				profile,
				'--scope',
				scope,
				'--name',
				`${name}-components`
			],
			{ stdio: [0, 0, 0] }
		);

		createProject.on('close', code => {
			resolve(true);
		});
	});

	return commandPromise;
};

/**
 * Used to recreate the 'src' folder of the project as a blank template if the user wanted to start from scratch
 */
const remakeSource = async () => {
	fs.rmdirSync('src', { recursive: true });
	await createFolder('src');
	await createFile(
		'src/index.js',
		'// Add import statements for each deployed component here\n'
	);
};

/**
 * Deletes the default component created when the 'snc ui-component project' command is run.
 * Also cleans out references of the default component
 */
const removeDefaultComponent = async () => {
	// Remake the source folder
	await remakeSource();

	// Rewrite the example > element.js file
	await createFile(
		'example/element.js',
		`import '../src/index.js';

const el = document.createElement('DIV');
document.body.appendChild(el);

el.innerHTML = "";
`
	);

	// Empty the components field in the now-ui.json
	const nowUIJson = JSON.parse(
		fs.readFileSync('now-ui.json', { encoding: 'utf-8' })
	);
	nowUIJson.components = {};
	await createFile('now-ui.json', JSON.stringify(nowUIJson, null, 2));
};

/**
 * Runs npm install
 * @returns
 */
const installDependencies = async () => {
	printHeader('Installing dependencies');
	const commandPromise = new Promise((resolve, reject) => {
		// Spawn a child process to run 'npm install', this process will use the parent's input, output, and error streams
		const npmInstall = spawn('npm', ['install'], { stdio: [0, 0, 0] });

		npmInstall.on('close', code => {
			resolve('ok');
		});
	});

	return commandPromise;
};

/**
 * The main command function for the 'yala setup' command
 * @param {boolean} debugMode flag to tell if debug mode is on or not
 */
const yalaSetup = async debugMode => {
	try {
		// Run through the requirements
		if (!(await checkRequirements()))
			throw new Error('Requirements not met');

		// Setup the profile to use for the new component
		printHeader('Select ServiceNow instance profile');
		const profile = await getProfile();
		if (!profile) throw new Error('Profile not set');

		// Create a new custom component project
		if (!(await createProject(profile)))
			throw new Error('Project not created');

		console.log();
		const { removeDefault } = await prompt({
			name: 'removeDefault',
			type: 'confirm',
			message: chalk.yellow(
				'Remove the default component from this project?'
			)
		});

		if (removeDefault) {
			// Remove the default component
			await removeDefaultComponent();
		}

		// Run 'npm install'
		await installDependencies();

		console.log(
			chalk.green(
				"\n🎉 New component project created! Switch to your new project folder and run 'yala create-component' to create a component 🎉\n"
			)
		);
	} catch (error) {
		if (debugMode) log(chalk.red(`DEBUG: ${error}`));
		console.log(chalk.bgRed(`\nyala setup failed\n`));
	}
};

module.exports = {
	yalaSetup
};
