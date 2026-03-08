import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION: Define your desired ports here
// ============================================================================
const PORTS = {
    API: 9471,
    DASHBOARD: 9472,
    PROXY: 9473,
};

// ============================================================================
// SCRIPT LOGIC
// ============================================================================

const TARGET_EXTENSIONS = ['.ts', '.md', '.yml', '.yaml', '.json', '.env', '.env.example', '.env.development'];
const TARGET_FILES_EXACT = ['Dockerfile.api', 'Dockerfile.proxy', 'Dockerfile.dashboard', '.cursorrules'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', '.git', '.gemini'];

function walkDir(dir: string, fileList: string[] = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                walkDir(filePath, fileList);
            }
        } else {
            const ext = path.extname(file);
            if (TARGET_EXTENSIONS.includes(ext) || TARGET_FILES_EXACT.includes(file) || file.startsWith('.env')) {
                // Ensure we don't accidentally process package-lock.json
                if (file !== 'package-lock.json') {
                    fileList.push(filePath);
                }
            }
        }
    }
    return fileList;
}

function updatePortsInFile(filePath: string) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let newContent = content;

    // We use a regex that matches the current defaults. 
    // If you run this script again in the future, you must update the "current" values below
    // to whatever ports the app is CURRENTLY using before changing to the NEW ports.

    // CURRENT PORTS (Change these if the app is currently on different ports)
    const CURRENT_API = "9471";
    const CURRENT_DASHBOARD = "9472";
    const CURRENT_PROXY = "9473";

    const regexMap = [
        { regex: new RegExp(`(localhost:|APP_PORT.*:|PORT=)(${CURRENT_API})(?![0-9])`, 'g'), replacement: `$1${PORTS.API}` },
        { regex: new RegExp(`(localhost:|DASHBOARD_PORT.*:|PORT=)(${CURRENT_DASHBOARD})(?![0-9])`, 'g'), replacement: `$1${PORTS.DASHBOARD}` },
        { regex: new RegExp(`(localhost:|PROXY_PORT.*:|PORT=)(${CURRENT_PROXY})(?![0-9])`, 'g'), replacement: `$1${PORTS.PROXY}` },

        // For Markdown tables (e.g., `| 9471 |`)
        { regex: new RegExp(`(\\| )(${CURRENT_API})( \\|)`, 'g'), replacement: `$1${PORTS.API}$3` },
        { regex: new RegExp(`(\\| )(${CURRENT_DASHBOARD})( \\|)`, 'g'), replacement: `$1${PORTS.DASHBOARD}$3` },
        { regex: new RegExp(`(\\| )(${CURRENT_PROXY})( \\|)`, 'g'), replacement: `$1${PORTS.PROXY}$3` },

        // For inline markdown (e.g., `:9471` or `9471`)
        { regex: new RegExp(`(:)(${CURRENT_API})(?![0-9])`, 'g'), replacement: `$1${PORTS.API}` },
        { regex: new RegExp(`(:)(${CURRENT_DASHBOARD})(?![0-9])`, 'g'), replacement: `$1${PORTS.DASHBOARD}` },
        { regex: new RegExp(`(:)(${CURRENT_PROXY})(?![0-9])`, 'g'), replacement: `$1${PORTS.PROXY}` },

        // For default fallback ports in TypeScript: parseInt(..., 10) or Joi defaults
        { regex: new RegExp(`(default\\(|\\|\\| '|<number>\\('.*', )(${CURRENT_API})(:?\\)|', 10)`, 'g'), replacement: `$1${PORTS.API}$3` },
        { regex: new RegExp(`(default\\(|\\|\\| '|<number>\\('.*', )(${CURRENT_DASHBOARD})(:?\\)|', 10)`, 'g'), replacement: `$1${PORTS.DASHBOARD}$3` },
        { regex: new RegExp(`(default\\(|\\|\\| '|<number>\\('.*', )(${CURRENT_PROXY})(:?\\)|', 10)`, 'g'), replacement: `$1${PORTS.PROXY}$3` },

        // Port exposes in dockerfiles
        { regex: new RegExp(`(EXPOSE )(${CURRENT_API})`, 'g'), replacement: `$1${PORTS.API}` },
        { regex: new RegExp(`(EXPOSE )(${CURRENT_DASHBOARD})`, 'g'), replacement: `$1${PORTS.DASHBOARD}` },
        { regex: new RegExp(`(EXPOSE )(${CURRENT_PROXY})`, 'g'), replacement: `$1${PORTS.PROXY}` },
    ];

    for (const { regex, replacement } of regexMap) {
        if (regex.test(newContent)) {
            newContent = newContent.replace(regex, replacement);
            hasChanges = true;
        }
    }

    // Special fix for package.json scripts
    if (path.basename(filePath) === 'package.json') {
        const nextDevRegex = new RegExp(`(next (dev|start) -p )(${CURRENT_DASHBOARD})(?![0-9])`, 'g');
        if (nextDevRegex.test(newContent)) {
            newContent = newContent.replace(nextDevRegex, `$1${PORTS.DASHBOARD}`);
            hasChanges = true;
        }
    }

    if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ Updated: ${filePath}`);
    }
}

function main() {
    const rootDir = path.resolve(__dirname, '..');
    console.log(`Starting port update in ${rootDir}...`);
    console.log(`Targeting ports -> API: ${PORTS.API}, DASHBOARD: ${PORTS.DASHBOARD}, PROXY: ${PORTS.PROXY}`);

    const files = walkDir(rootDir);
    console.log(`Found ${files.length} valid files to check.`);

    for (const file of files) {
        try {
            updatePortsInFile(file);
        } catch (error) {
            console.error(`❌ Failed to update ${file}:`, error);
        }
    }

    console.log('🎉 Port update complete!');
}

main();
