/**
 * Gets the <component_name>.js template
 * @returns string contents of the <component_name>.js file
 */
const getComponentTemplate = componentName => {
	const componentTemplate = `
import { createCustomElement } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import { actionHandlers } from './actionHandlers';
import styles from './styles.scss';

createCustomElement('${componentName}', {
    initialState: {},
    view: (state, helpers) => {

        return (
            <div>
                {/* Define view here */}
                ${componentName}: Hello World!
            </div>
        );
    },
    properties: {},
    actionHandlers: {...actionHandlers},
    eventHandlers: [],
    styles,
    renderer: { type: snabbdom }
});
`;

	return componentTemplate;
};

module.exports = {
	getComponentTemplate
};
