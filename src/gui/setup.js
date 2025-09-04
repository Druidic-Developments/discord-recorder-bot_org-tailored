import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function has(cmd) {
  try {
    execSync(`${cmd} -v`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function install(cmd, linux, mac, win) {
  console.log(`[Setup] Installing ${cmd}...`);
  try {
    const platform = process.platform;
    if (platform === 'linux') {
      execSync(`sudo apt-get install -y ${linux}`, { stdio: 'inherit' });
    } else if (platform === 'darwin') {
      execSync(`brew install ${mac}`, { stdio: 'inherit' });
    } else if (platform === 'win32') {
      execSync(`winget install --silent ${win}`, { stdio: 'inherit' });
    }
  } catch (e) {
    console.log(`[Setup] Failed to install ${cmd}. Please install manually.`);
    throw e;
  }
}

export function checkDependencies() {
  if (!has('node')) install('node.js', 'nodejs', 'node', 'OpenJS.NodeJS');
  if (!has('ffmpeg')) install('ffmpeg', 'ffmpeg', 'ffmpeg', 'Gyan.FFmpeg');
}

export function needsSetup() {
  dotenv.config();
  return !process.env.DISCORD_TOKEN;
}

export function saveCredentials(token, guild) {
  const envPath = path.resolve('.env');
  const env = `DISCORD_TOKEN=${token.trim()}\nGUILD_IDS=${guild.trim()}\n`;
  writeFileSync(envPath, env);
  dotenv.config();
}

export function appendGuildId(id) {
  const envPath = path.resolve('.env');
  let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const match = content.match(/GUILD_IDS=([^\n]*)/);
  let ids = match ? match[1].split(/[ ,]+/).filter(Boolean) : [];
  if (!ids.includes(id)) ids.push(id);
  if (match) {
    content = content.replace(/GUILD_IDS=[^\n]*/, `GUILD_IDS=${ids.join(',')}`);
  } else {
    content += `\nGUILD_IDS=${ids.join(',')}`;
  }
  writeFileSync(envPath, content);
}

export function openRecordingFolder() {
  dotenv.config();
  const dir = process.env.AUDIO_DIR || './recordings';
  return path.resolve(dir);
}

export function launchBot(logFn) {
  const bot = spawn(process.execPath, [path.join(process.cwd(), 'src', 'bot.js')]);
  bot.stdout.on('data', (d) => logFn(d.toString()));
  bot.stderr.on('data', (d) => logFn(d.toString()));
  bot.on('close', (code) => logFn(`[Bot exited with code ${code}]\n`));
  return bot;
}