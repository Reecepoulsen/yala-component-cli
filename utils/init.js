const welcome = require('cli-welcome');
const unhandled = require('cli-handle-unhandled');
const chalk = require('chalk');
const ora = require('ora');
const { spawn } = require('child_process');
const { printHeader } = require('./utilities.js');

const getCurrentVersion = async () => {
	// run yala -v to see what is installed
	const yalaVersionCommand = new Promise((resolve, reject) => {
		const yalaVersion = spawn('yala', ['-v']);
		yalaVersion.stdout.on('data', output => {
			resolve(output.toString());
		});
	});
	return yalaVersionCommand;
};

const getLatestVersion = async () => {
	// run npm view yala-component-cli to check the latest version
	const npmViewCommand = new Promise((resolve, reject) => {
		const npmView = spawn('npm', ['view', 'yala-component-cli', 'version']);
		npmView.stdout.on('data', output => {
			resolve(output.toString());
		});
	});
	return npmViewCommand;
};

/**
 * This function checks if yala-component-cli needs updated and runs the update if needed
 */
const checkForUpdates = async (curVersion, latestVersion) => {
	let ranUpdate = false;

	if (curVersion != latestVersion) {
		// If an update is needed, run npm update yala-component-cli -g
		const updateSpinner = ora(
			chalk.yellow(
				'A new version of yala-component-cli is available, updating now'
			)
		).start();
		const updateCommand = new Promise((resolve, reject) => {
			const npmUpdate = spawn(
				'npm',
				['update', 'yala-component-cli', '-g'],
				{ stdio: [0, 0, 0] }
			);
			npmUpdate.on('close', code => resolve('ok'));
		});
		await updateCommand;
		ranUpdate = true;
		updateSpinner.succeed(chalk.green('yala-component-cli updated'));
	}

	return ranUpdate;
};

const init = async ({ clear = true }) => {
	const curVersion = await getCurrentVersion();
	const latestVersion = await getLatestVersion();
	const ranUpdate = await checkForUpdates(curVersion, latestVersion);
	const version = ranUpdate ? latestVersion : curVersion;

	unhandled();
	welcome({
		title: `yala-component-cli`,
		tagLine: `by Yansa Labs`,
		description:
			"Yansa Labs' improved CLI solution for ServiceNow custom component development",
		version: version.replace('\n', ''),
		bgColor: '#36BB09',
		color: '#000000',
		bold: true,
		clear
	});
};

module.exports = {
	init
};
