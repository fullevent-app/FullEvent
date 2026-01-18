import { PackageManager } from './detect';
import { execSync } from 'child_process';
import { logVerbose } from './util';

export async function installSdk(packageManager: PackageManager, cwd: string) {
    const installCmd = packageManager === 'npm' ? 'install' : 'add';
    const sdkPackage = process.env.FULLEVENT_SDK_VERSION || '@fullevent/node';
    const command = `${packageManager} ${installCmd} ${sdkPackage}`;

    logVerbose(`Running: ${command}`);

    try {
        execSync(command, { stdio: 'inherit', cwd });
        return true;
    } catch (error) {
        console.error('Failed to install SDK:', error);
        return false;
    }
}
