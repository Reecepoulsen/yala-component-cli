const alert = require('cli-alerts');

const log = info => {
	alert({
		type: `warning`,
		name: `DEBUG LOG`,
		msg: ``
	});

	console.log(info);
	console.log();
};

module.exports = {
	log
};
