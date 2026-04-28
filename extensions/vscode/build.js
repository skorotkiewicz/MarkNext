// Build script for VSCode extension
// Bundles the extension + marknext library into out/extension.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(__dirname, 'out');

// Ensure out directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Check if esbuild is available
function hasEsbuild() {
  try {
    require.resolve('esbuild');
    return true;
  } catch {
    return false;
  }
}

// Check if bun is available
function hasBun() {
  try {
    execSync('bun --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Copy the pre-built dist files from the main project as a fallback
function copyDistFiles() {
  const rootDist = path.join(__dirname, '..', '..', 'dist');
  if (!fs.existsSync(rootDist)) {
    console.error('Error: Main project dist/ not found. Run "bun run build" in the project root first.');
    process.exit(1);
  }

  // Copy index.js as marknext.js
  fs.copyFileSync(
    path.join(rootDist, 'index.js'),
    path.join(outDir, 'marknext.js')
  );
  console.log('Copied dist/index.js -> out/marknext.js');

  // Compile extension.ts with tsc (which should now import from ./marknext)
  execSync('npx tsc -p ./', { stdio: 'inherit', cwd: __dirname });
  console.log('Compiled extension.ts with tsc');
}

if (hasEsbuild()) {
  console.log('Using esbuild for bundling...');
  const esbuild = require('esbuild');

  esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    outfile: path.join(outDir, 'extension.js'),
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    external: ['vscode'],
    sourcemap: true,
    resolveExtensions: ['.ts', '.js'],
  }).then(() => {
    console.log('Bundled extension.js with esbuild');
  }).catch(err => {
    console.error('esbuild failed:', err);
    process.exit(1);
  });
} else if (hasBun()) {
  console.log('Using bun for bundling...');
  execSync(
    'bun build ./src/extension.ts --outfile ./out/extension.js --format cjs --target node --external vscode',
    { stdio: 'inherit', cwd: __dirname }
  );
} else {
  console.log('No bundler found. Falling back to tsc + copy dist files...');
  copyDistFiles();
}
