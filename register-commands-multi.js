import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const token = process.env.DISCORD_TOKEN;
let clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID || null;
// Comma/space separated list
const guildIdsEnv = process.env.GUILD_IDS || '';
const guildIds = guildIdsEnv.split(/[ ,]+/).map(s => s.trim()).filter(Boolean);

const commands = [];

async function load(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith('_')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await load(p);
    } else if (ent.isFile() && p.endsWith('.js')) {
      const mod = await import(pathToFileURL(p).href);
      if (mod?.data?.toJSON) commands.push(mod.data.toJSON());
    }
  }
}
await load(path.join(process.cwd(), 'src', 'commands'));

const rest = new REST({ version: '10' }).setToken(token);

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getCurrentApplication() {
  try {
    const app = await rest.get(Routes.currentApplication());
    return app; // { id, name, ... }
  } catch (e) {
    throw new Error(`Unable to fetch current application using provided token. Check DISCORD_TOKEN. Original: ${e?.message || e}`);
  }
}

async function ensureClientIdMatchesToken() {
  const app = await getCurrentApplication();
  if (!clientId) {
    console.warn(`[Info] CLIENT_ID not set. Using application id from token: ${app.id} (${app.name})`);
    clientId = app.id;
    return;
  }
  if (String(clientId) !== String(app.id)) {
    console.warn(`[Warn] CLIENT_ID (${clientId}) does not match token's application id (${app.id}, ${app.name}). Using ${app.id} to avoid 403 Missing Access.`);
    clientId = app.id;
  } else {
    console.log(`[OK] CLIENT_ID matches application id: ${clientId} (${app.name})`);
  }
}

async function ensureBotInGuild(gid) {
  try {
    // If the bot is not in guild, this will 403/404
    const g = await rest.get(Routes.guild(gid));
    return g; // minimal guild object
  } catch (e) {
    const code = e?.code || e?.rawError?.code;
    const status = e?.status;
    const reason = e?.message || e?.rawError?.message || 'Unknown';
    throw new Error(`Bot not in guild ${gid} or missing access (status ${status}, code ${code}). Reason: ${reason}. Invite the bot with scope=bot+applications.commands.`);
  }
}

async function registerAll() {
  if (!token) {
    throw new Error('DISCORD_TOKEN is not set. Provide your bot token in .env');
  }
  await ensureClientIdMatchesToken();
  console.log(`[Info] Commands discovered: ${commands.length}`);

  if (guildIds.length > 0) {
    for (const gid of guildIds) {
      try {
        await ensureBotInGuild(gid);
        await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: commands });
        console.log(`[OK] Registered ${commands.length} commands to guild ${gid}`);
      } catch (e) {
        console.error(`[Error] Failed to register commands to guild ${gid}:`, e?.message || e);
        console.error('Hint: Ensure the bot is in that guild and was invited with scopes: bot applications.commands');
      }
      await delay(350);
    }
    return;
  }
  if (guildId) {
    await ensureBotInGuild(guildId);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`[OK] Registered ${commands.length} commands to guild ${guildId}`);
    return;
  }
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`[OK] Registered ${commands.length} global commands`);
}

registerAll().catch((e) => { console.error(e); process.exit(1); });
