import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID || null;
// Comma/space separated list
const guildIdsEnv = process.env.GUILD_IDS || '';
const guildIds = guildIdsEnv.split(/[ ,]+/).map(s => s.trim()).filter(Boolean);

const commands = [];

async function load(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
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

async function registerAll() {
  if (guildIds.length > 0) {
    for (const gid of guildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: commands });
      console.log(`[OK] Registered ${commands.length} commands to guild ${gid}`);
      await new Promise(r => setTimeout(r, 350));
    }
    return;
  }
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`[OK] Registered ${commands.length} commands to guild ${guildId}`);
    return;
  }
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`[OK] Registered ${commands.length} global commands`);
}

registerAll().catch((e) => { console.error(e); process.exit(1); });
