/**
 * Gets the index.js template
 * @returns string contents of the index.js file
 */
const getIndexTemplate = componentName => {
	const indexTemplate = `import './${componentName}.js'`;
	return indexTemplate;
};

module.exports = {
	getIndexTemplate
};
