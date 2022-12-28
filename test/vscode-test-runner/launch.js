const path = require("path");
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, ...['..', '..']);

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, 'runTests');
    const testWorkspace = path.resolve(__dirname, 'workspace-1');

    const launchArgs = [testWorkspace, '--disable-extensions', '--disable-workspace-trust'];

    // Download VS Code, unzip it and run the integration test
    await runTests({
      version: 'insiders',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

void main();
