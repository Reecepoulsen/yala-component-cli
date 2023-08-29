/**
 * Gets the styles.scss template
 * @returns string contents of the styles.scss file
 */
const getStylesTemplate = () => {
	const stylesTemplate = `@import '@servicenow/sass-kit/host';\n`;
	return stylesTemplate;
};

module.exports = {
	getStylesTemplate
};
