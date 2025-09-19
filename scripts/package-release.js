import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function main() {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = await fs.readJson(pkgPath);
  const version = pkg.version || '0.0.0';

  const releaseRoot = path.join(rootDir, 'release');
  const tag = `Discord-Recorder-v${version}`;
  const targetDir = path.join(releaseRoot, tag);

  console.log(`[package] Preparing release folder: ${targetDir}`);
  await fs.ensureDir(releaseRoot);
  await fs.emptyDir(targetDir);

  const copyLog = [];
  async function copyToRelease(sourceRel, destRel = sourceRel) {
    const source = path.join(rootDir, sourceRel);
    const destination = path.join(targetDir, destRel);
    if (!(await fs.pathExists(source))) {
      console.warn(`[package] Skipped missing path: ${sourceRel}`);
      return false;
    }
    await fs.copy(source, destination, { dereference: true });
    copyLog.push(`${sourceRel} -> ${destRel}`);
    return true;
  }

  // Root-level collateral
  await copyToRelease('README.md');
  await copyToRelease('POLICY.md');
  await copyToRelease('.env.example');
  await copyToRelease('Start-Recorder.bat');
  await copyToRelease('start-app.ps1');
  await copyToRelease('docs');

  // Core bot distribution
  const botDir = 'bot';
  await fs.ensureDir(path.join(targetDir, botDir));
  await copyToRelease('package.json', path.join(botDir, 'package.json'));
  await copyToRelease('package-lock.json', path.join(botDir, 'package-lock.json'));
  await copyToRelease('src', path.join(botDir, 'src'));
  await copyToRelease('register-commands-multi.js', path.join(botDir, 'register-commands-multi.js'));
  await copyToRelease('storage', path.join(botDir, 'storage'));

  // Optional GUI build artifacts
  const distDir = path.join(rootDir, 'dist');
  if (await fs.pathExists(distDir)) {
    await copyToRelease('dist', 'gui-build');
  } else {
    console.warn('[package] dist/ not found. Run "npm run build:win" if you need the GUI executable.');
  }

  // Summary log
  if (copyLog.length) {
    console.log('[package] Copied assets:');
    for (const line of copyLog) {
      console.log(`  - ${line}`);
    }
  }

  // Generate checksums
  const files = await listFiles(targetDir);
  const checksumLines = [];
  for (const rel of files) {
    const abs = path.join(targetDir, rel);
    const hash = await hashFile(abs);
    checksumLines.push(`${hash}  ${rel.split(path.sep).join('/')}`);
  }
  const checksumPath = path.join(targetDir, 'SHA256SUMS.txt');
  await fs.writeFile(checksumPath, checksumLines.join('\n') + '\n', 'utf8');
  console.log(`[package] Wrote checksums for ${files.length} files.`);

  console.log(`[package] Release ready at ${targetDir}`);
}

async function listFiles(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(abs, base));
    } else if (entry.isFile()) {
      files.push(path.relative(base, abs));
    }
  }
  return files.sort();
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

main().catch((err) => {
  console.error('[package] Failed to build release', err);
  process.exit(1);
});