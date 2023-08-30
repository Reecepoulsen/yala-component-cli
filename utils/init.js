const welcome = require('cli-welcome');
const unhandled = require('cli-handle-unhandled');
const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('./package.json'));

const init = ({ clear = true }) => {
	unhandled();
	welcome({
		title: `yala-component-cli`,
		tagLine: `by Yansa Labs`,
		description: packageJson.description,
		version: packageJson.version,
		bgColor: '#36BB09',
		color: '#000000',
		bold: true,
		clear
	});
};

module.exports = {
	init
};
