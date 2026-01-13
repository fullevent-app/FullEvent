import fs from 'fs';
import path from 'path';
import { ProjectType } from './detect';
import { logVerbose } from './util';

export async function scaffoldClientFile(cwd: string, apiKey: string, projectType: ProjectType) {
    const isTs = projectType === 'typescript';
    const ext = isTs ? 'ts' : 'js';

    // Determine location
    const srcLibDir = path.join(cwd, 'src', 'lib');
    const libDir = path.join(cwd, 'lib');
    const rootDir = cwd;

    let targetDir = rootDir;
    if (fs.existsSync(srcLibDir) || fs.existsSync(path.join(cwd, 'src'))) {
        targetDir = srcLibDir;
    } else if (fs.existsSync(libDir)) {
        targetDir = libDir;
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `fullevent.${ext}`;
    const filePath = path.join(targetDir, fileName);

    const content = `import { FullEvent } from "@fullevent/node-sdk";

export const fullevent = new FullEvent({
  apiKey: "${apiKey}",
});
`;

    fs.writeFileSync(filePath, content);
    logVerbose(`Created client file at: ${filePath}`);

    return filePath;
}
