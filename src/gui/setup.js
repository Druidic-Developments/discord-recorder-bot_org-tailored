import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { parse } from 'dotenv';
import { REST, Routes } from 'discord.js';
import { Consent } from '../storage/db.js';
const ENV_PATH = path.resolve('.env');

function readEnvFile() {
  if (!existsSync(ENV_PATH)) return {};
  const raw = readFileSync(ENV_PATH, 'utf8');
  return parse(raw);
}

function writeEnvFile(entries) {
  const lines = Object.entries(entries)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => {
      const str = String(value ?? '');
      if (str === '') return `${key}=`;
      const needsQuotes = /[\s#"']/u.test(str);
      const formatted = needsQuotes ? `"${str.replace(/"/g, '\"')}"` : str;
      return `${key}=${formatted}`;
    });
  writeFileSync(ENV_PATH, `${lines.join('\n')}\n`);
}


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
   const env = readEnvFile();
  return !env.DISCORD_TOKEN;
}

export function loadSettings() {
  const env = readEnvFile();
  const guildIds = (env.GUILD_IDS || env.GUILD_ID || '')
    .split(/[ ,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
    return {
      token: env.DISCORD_TOKEN || '',
      clientId: env.CLIENT_ID || '',
      guildIds,
      audioDir: env.AUDIO_DIR ? path.resolve(env.AUDIO_DIR) : path.resolve('./recordings')
    };
  }

export function saveSettings({ token, clientId, guildIds, audioDir }) {
  const current = readEnvFile();
  const normalizedGuildIds = Array.isArray(guildIds)
    ? [...new Set(guildIds.map((id) => id.trim()).filter(Boolean))]
    : [];
  const next = {
    ...current,
    DISCORD_TOKEN: token?.trim() || '',
    CLIENT_ID: clientId?.trim() || '',
    GUILD_IDS: normalizedGuildIds.join(','),
    AUDIO_DIR: audioDir ? path.resolve(audioDir) : current.AUDIO_DIR
  };
  writeEnvFile(next);
  dotenv.config({ path: ENV_PATH, override: true });
  return loadSettings();
}

export function openRecordingFolder() {
  const settings = loadSettings();
  return path.resolve(settings.audioDir || './recordings');
}

export function launchBot(logFn) {
  const bot = spawn(process.execPath, [path.join(process.cwd(), 'src', 'bot.js')], {
    env: { ...process.env, ...readEnvFile() }
  });
  bot.stdout.on('data', (d) => logFn(d.toString()));
  bot.stderr.on('data', (d) => logFn(d.toString()));
  bot.on('close', (code) => logFn(`[Bot exited with code ${code}]\n`));
  return bot;
}

function consentingForGuild(guildId) {
  return Consent.listByGuild(guildId).map((row) => ({
    id: row.user_id,
    updatedAt: row.updated_at
  }));
}

export async function fetchGuildSummaries(tokenOverride) {
  const settings = loadSettings();
  const effectiveToken = tokenOverride || settings.token;
  if (!effectiveToken) {
    return { entries: [], warnings: ['Bot token is not configured. Unable to contact Discord.'] };
  }

  const rest = new REST({ version: '10' }).setToken(effectiveToken);
  let guilds = [];
  const warnings = [];
  try {
    const response = await rest.get(Routes.userGuilds());
    if (Array.isArray(response)) guilds = response;
  } catch {
    guilds = [];
    warnings.push('Unable to retrieve guild membership from Discord. Showing saved IDs and consent records only.');
  }

  const consentGuildIds = new Set(Consent.listGuilds());
  for (const g of guilds) consentGuildIds.add(g.id);
  if (consentGuildIds.size === 0) {
    settings.guildIds.forEach((id) => consentGuildIds.add(id));
  }

  const summaries = [];
  for (const guildId of consentGuildIds) {
    let guildName = 'Unknown Guild';
    let inGuild = false;
    const found = guilds.find((g) => g.id === guildId);
    if (found) {
      guildName = found.name;
      inGuild = true;
    } else {
      try {
        const guild = await rest.get(Routes.guild(guildId));
        guildName = guild?.name || guildName;
      } catch {
        guildName = `${guildName} (${guildId})`;
      }
    }

    const consenting = consentingForGuild(guildId);
    const detailed = [];
    for (const entry of consenting) {
      try {
        const user = await rest.get(Routes.user(entry.id));
        const displayTag =
          user.global_name ||
          (user.discriminator && user.discriminator !== '0'
            ? `${user.username}#${user.discriminator}`
            : user.username);
        detailed.push({ id: entry.id, tag: displayTag, updatedAt: entry.updatedAt });
      } catch {
        detailed.push({ id: entry.id, tag: null, updatedAt: entry.updatedAt });
      }
    }
    summaries.push({ id: guildId, name: guildName, inGuild, consenting: detailed });
  }
  return {
    entries: summaries.sort((a, b) => a.name.localeCompare(b.name)),
    warnings
  };
}
