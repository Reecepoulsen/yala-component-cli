const welcome = require('cli-welcome');
const unhandled = require('cli-handle-unhandled');

const init = ({ clear = true }) => {
	unhandled();
	welcome({
		title: `yala-component-cli`,
		tagLine: `by Yansa Labs`,
		description:
			"Yansa Labs' improved CLI solution for ServiceNow custom component development",
		version: '1.0.5',
		bgColor: '#36BB09',
		color: '#000000',
		bold: true,
		clear
	});
};

module.exports = {
	init
};
