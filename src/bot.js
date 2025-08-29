import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { CONFIG, ensureDirs } from './config.js';
import { startRetentionTask } from './tasks/retention.js';

console.log('[Boot] Starting bot process...');
console.log('[Boot] Effective config:', {
  AUDIO_DIR: CONFIG.AUDIO_DIR,
  OUTPUT_FORMAT: CONFIG.OUTPUT_FORMAT,
  BITRATE: CONFIG.BITRATE,
  RETENTION_DAYS: CONFIG.RETENTION_DAYS,
  ALIGNMENT_MODE: CONFIG.ALIGNMENT_MODE,
  PAD_AFTER_OPTOUT: CONFIG.PAD_AFTER_OPTOUT,
  LOG_LEVEL: CONFIG.LOG_LEVEL,
  CLIENT_ID: CONFIG.CLIENT_ID,
  GUILD_ID: CONFIG.GUILD_ID ?? 'none'
});

ensureDirs();
console.log('[Boot] Directories ensured.');

console.log('[Boot] Initializing Discord client...');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});
client.config = CONFIG;
client.commands = new Collection();
console.log('[Boot] Discord client created.');

async function loadCommands() {
  const loaded = [];
  async function loadDir(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await loadDir(p);
      } else if (p.endsWith('.js')) {
        try {
          const mod = await import(`file://${p}`);
          if (mod.data && mod.execute) {
            client.commands.set(mod.data.name, mod);
            loaded.push(mod.data.name);
            console.log(`[Commands] Loaded: ${mod.data.name} (${p})`);
          } else {
            console.warn(`[Commands] Skipped (no data/execute): ${p}`);
          }
        } catch (err) {
          console.error(`[Commands] Failed to load ${p}`, err);
        }
      }
    }
  }
  const root = path.join(process.cwd(), 'src/commands');
  console.log(`[Boot] Loading commands from: ${root}`);
  await loadDir(root);
  console.log(`[Boot] Commands ready: ${client.commands.size} total`, loaded);
}
await loadCommands();

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('[Task] Starting retention task...');
  startRetentionTask();
  console.log('[Task] Retention task scheduled.');
});

client.on('warn', (m) => console.warn('[Warn]', m));
client.on('error', (e) => console.error('[ClientError]', e));
client.on('shardError', (e) => console.error('[ShardError]', e));
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  console.log(
    `[Interaction] /${interaction.commandName} by ${interaction.user.tag}` +
      (interaction.guild ? ` in ${interaction.guild.name}` : ' in DM')
  );
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) {
    console.warn(`[Interaction] Command not found: /${interaction.commandName}`);
    return;
  }
  try {
    console.log(`[Command] Executing: /${interaction.commandName}`);
    await cmd.execute(interaction);
    console.log(`[Command] Completed: /${interaction.commandName}`);
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

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
});

console.log('[Boot] Logging in to Discord...');
client
  .login(CONFIG.TOKEN)
  .then(() => console.log('[Boot] Login request sent, waiting for ready...'))
  .catch((err) => console.error('[Boot] Login failed', err));
