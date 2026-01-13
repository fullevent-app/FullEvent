import { getCommandPath } from './util';
import fs from 'fs';
import path from 'path';

export type ProjectType = 'typescript' | 'javascript';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export async function detectProjectType(cwd: string): Promise<ProjectType> {
    if (fs.existsSync(path.join(cwd, 'tsconfig.json'))) {
        return 'typescript';
    }
    return 'javascript';
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
    if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';
    return 'npm';
}
