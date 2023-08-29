/**
 * Gets the actionHandler.js template
 * @returns string contents of the actionHandler.js file
 */
const getActionHandlerTemplate = () => {
	const actionHandlersTemplate = `
export const actionHandlers = {
  /**
   * Define Action Handlers here
   *
   * Example:
   * // https://developer.servicenow.com/dev.do#!/reference/next-experience/vancouver/ui-framework/main-concepts/action-handlers
   * 'BUTTON_CLICKED': (coeffects) => {
   *    console.log('A button was clicked!');
   * },
   * // https://developer.servicenow.com/dev.do#!/reference/next-experience/vancouver/ui-framework/api-reference/effect-http
   * 'FETCH_USER': createHttpEffect('api/users/:id', {
   *    method: 'POST',
   *    headers: {
   *      'X-UserToken': window.g_ck
   *    },
   *    pathParams: ['id'],
   *    dataParams: 'data',
   *    successActionType: 'USER_FETCH_SUCCESS'
   * })
   */
};
`;
	return actionHandlersTemplate;
};

module.exports = {
	getActionHandlerTemplate
};
