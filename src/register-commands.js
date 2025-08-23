import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // optional

const commands = [];
function load(dir) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) load(p);
    else if (file.name.endsWith('.js')) {
      const mod = await import(`file://${p}`);
      if (mod.data?.toJSON) commands.push(mod.data.toJSON());
    }
  }
}
await load(path.join(process.cwd(), 'src/commands'));

const rest = new REST({ version: '10' }).setToken(token);
try {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Registered ${commands.length} guild command(s) to ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`Registered ${commands.length} global command(s)`);
  }
} catch (e) {
  console.error(e);
  process.exit(1);
}
