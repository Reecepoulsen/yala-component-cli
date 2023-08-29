const meow = require('meow');
const meowHelp = require('cli-meow-help');

const flags = {
	clear: {
		type: `boolean`,
		default: true,
		alias: `c`,
		desc: `Clear the console`
	},
	debug: {
		type: `boolean`,
		default: false,
		alias: `d`,
		desc: `Print debug info`
	},
	version: {
		type: `boolean`,
		alias: `v`,
		desc: `Print CLI version`
	}
};

const commands = {
	help: { desc: `Print help info` },
	setup: { desc: `Setup a new custom component project` },
	'create-component': {
		desc: 'Create a new component in your current project'
	},
	'delete-component': {
		desc: 'Delete a component from your project'
	},
	'add-property': {
		desc: 'Add a property to a component in the now-ui.json file'
	},
	'add-action': {
		desc: 'Add an action to a component in the now-ui.json file'
	},
	develop: {
		desc: `Starts a development server that renders the content of 'example/element.js'`
	},
	deploy: {
		desc: `Deploy your component to a ServiceNow instance. Add '--force' flag to force the deploy`
	},
	'create-xml': { desc: 'Export your component project to an xml update set' }
};

const helpText = meowHelp({
	name: `yala`,
	flags,
	commands
});

const options = {
	inferType: true,
	description: false,
	hardRejection: false,
	flags
};

const cli = meow(helpText, options);

module.exports = {
	cli
};
