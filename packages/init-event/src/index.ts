import { Command } from 'commander';
import prompts from 'prompts';
import pico from 'picocolors';
import { detectPackageManager, detectProjectType } from './detect';
import { installSdk } from './install';
import { scaffoldClientFile } from './scaffold';
import { logVerbose, configureVerboseLogging } from './util';

const program = new Command();

program
    .name('init-event')
    .description('Initialize FullEvent SDK')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options) => {
        if (options.verbose) {
            configureVerboseLogging({ level: 1 });
        }

        console.log(pico.bold(pico.blue('\nWelcome to FullEvent Init! 🚀\n')));

        const cwd = process.cwd();
        const projectType = await detectProjectType(cwd);
        const packageManager = await detectPackageManager(cwd);

        console.log(pico.gray(`Detected ${projectType} project using ${packageManager}`));

        const response = await prompts({
            type: 'text',
            name: 'apiKey',
            message: 'Enter your FullEvent API Key (leave blank to skip):',
        });

        if (response.apiKey === undefined) {
            console.log(pico.yellow('Operation cancelled.'));
            process.exit(1);
        }

        const apiKey = response.apiKey || 'YOUR_API_KEY';

        console.log(pico.cyan('\nInstalling SDK...'));
        const installSuccess = await installSdk(packageManager, cwd);
        if (!installSuccess) {
            console.log(pico.red('Failed to install SDK. Please check your package manager.'));
            process.exit(1);
        }

        console.log(pico.cyan('Scaffolding client file...'));
        try {
            const filePath = await scaffoldClientFile(cwd, apiKey, projectType);
            // Make path relative for nicer output
            const relativePath = filePath.replace(cwd + '/', '');
            console.log(pico.green(`\nSuccess! Created client at ${pico.bold(relativePath)}`));
            console.log(pico.green('SDK installed successfully.'));

            console.log(pico.bold('\nNext steps:'));
            console.log(`1. Import ${pico.cyan('fullevent')} from ${pico.white(relativePath)}`);
            console.log(`2. Run ${pico.cyan('fullevent.ping()')} to test your connection.`);
        } catch (err) {
            console.error(pico.red('Failed to scaffold file:'), err);
            process.exit(1);
        }
    });

program.parse();
