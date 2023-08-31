const welcome = require('cli-welcome');
const unhandled = require('cli-handle-unhandled');
const chalk = require('chalk');
const ora = require('ora');
const { spawn } = require('child_process');

/**
 * Runs the 'yala -v' command to get the current version of the CLI
 * @returns The current version of yala-component-cli
 */
const getCurrentVersion = async () => {
	// run yala -v to see what is installed
	let version = '';
	const yalaVersionCommand = new Promise((resolve, reject) => {
		const yalaVersion = spawn('yala', ['-v']);
		yalaVersion.stdout.on('data', output => {
			version = output.toString();
		});

		yalaVersion.on('error', e => (version = false));
		yalaVersion.on('close', code => resolve(version));
	});
	return yalaVersionCommand;
};

/**
 * Runs the 'npm view yala-component-cli version' command to get the latest version of the CLI
 * @returns The latest version number of the yala-component-cli
 */
const getLatestVersion = async () => {
	// run npm view yala-component-cli to check the latest version
	let version = '';
	const npmViewCommand = new Promise((resolve, reject) => {
		const npmView = spawn('npm', ['view', 'yala-component-cli', 'version']);
		npmView.stdout.on('data', output => {
			version = output.toString();
		});

		npmView.on('error', e => (version = false));
		npmView.on('close', code => resolve(version));
	});
	return npmViewCommand;
};

/**
 * This function checks if yala-component-cli needs updated and runs the update if needed
 */
const checkForUpdates = async (curVersion, latestVersion) => {
	let ranUpdate = false;

	if (!curVersion) return false;

	if (curVersion != latestVersion) {
		// If an update is needed, run npm update yala-component-cli -g
		const updateSpinner = ora(
			chalk.yellow(
				'A new version of yala-component-cli is available, updating now'
			)
		).start();
		const updateCommand = new Promise((resolve, reject) => {
			const npmUpdate = spawn('npm', [
				'update',
				'yala-component-cli',
				'-g'
			]);
			npmUpdate.on('close', code => resolve('ok'));
		});
		await updateCommand;
		ranUpdate = true;
		updateSpinner.succeed(chalk.green('yala-component-cli updated'));
	}

	return ranUpdate;
};

const init = async ({ clear = true }) => {
	try {
		const welcomeObj = {
			title: `yala-component-cli`,
			tagLine: `by Yansa Labs`,
			description:
				"Yansa Labs' improved CLI solution for ServiceNow custom component development",
			version: '',
			bgColor: '#36BB09',
			color: '#000000',
			bold: true,
			clear
		};

		const curVersion = await getCurrentVersion();
		const latestVersion = await getLatestVersion();
		const ranUpdate = await checkForUpdates(curVersion, latestVersion);
		let version = ranUpdate ? latestVersion : curVersion;
		if (version) welcomeObj.version = version.replace('\n', '');

		unhandled();
		welcome(welcomeObj);
	} catch (error) {
		console.log('Error during initialization' + error);
	}
};

module.exports = {
	init
};
