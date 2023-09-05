# yala-component-cli

Speed up your custom component development with Yansa Labs' Now CLI wrapper!

This package adds aditional functionality around ServiceNow's CLI to simplify the setup process and reduce the learning curve while using the CLI for local custom component development.

Check out this blog post for more details [Unlocking the Potential of ServiceNow's CLI](https://reecepoulsen.hashnode.dev/unlocking-the-potential-of-servicenows-cli)

## Installation

```
npm install -g yala-component-cli
```

## Requirements

-   Nodejs v12.16.1 or v14.21.3
-   [ServiceNow CLI](https://store.servicenow.com/sn_appstore_store.do#!/store/application/9085854adbb52810122156a8dc961910)

## Usage

Format: `yala <command> [option]`

### Commands

-   `help`: Print help info
-   `setup`: Setup a new custom component project
-   `create-component`: Create a new component in your current project
-   `delete-component`: Delete a component from your project
-   `add-property`: Add a property to a component in the now-ui.json file
-   `add-action`: Add a naction to a component in the now-ui.json file
-   `develop`: Starts a development server for your project that renders the content of 'example/element.js'
-   `deploy`: Deploy your component to a ServiceNow instance. Add the '--force' flag to force the deploy
-   `create-xml`: Export your component project to an xml update set

### Options

-   `-c`, `--clear`: Clear the console
-   `-d`, `--debug`: Print debug info
-   `-v`, `--version`: Print CLI version
