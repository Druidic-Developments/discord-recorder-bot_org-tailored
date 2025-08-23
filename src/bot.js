import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { CONFIG, ensureDirs } from './config.js';
import { startRetentionTask } from './tasks/retention.js';

ensureDirs();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});
client.config = CONFIG;
client.commands = new Collection();

async function loadCommands() {
  async function loadDir(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) await loadDir(p);
      else if (p.endsWith('.js')) {
        const mod = await import(`file://${p}`);
        if (mod.data && mod.execute) {
          client.commands.set(mod.data.name, mod);
        }
      }
    }
  }
  await loadDir(path.join(process.cwd(), 'src/commands'));
}
await loadCommands();

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startRetentionTask();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (e) {
    console.error(e);
    const msg = e?.message || 'Unknown error';
    if (interaction.deferred || interaction.replied) {
      interaction.editReply({ content: `❌ ${msg}` }).catch(()=>{});
    } else {
      interaction.reply({ content: `❌ ${msg}`, ephemeral: true }).catch(()=>{});
    }
  }
});

client.login(CONFIG.TOKEN);
