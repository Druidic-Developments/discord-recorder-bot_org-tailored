import { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Session } from '../../storage/db.js';
import { CONFIG } from '../../config.js';
import { safeJoin } from '../../utils/paths.js';

export const data = new SlashCommandBuilder()
  .setName('export_session')
  .setDescription('[Admin] Export a session as a ZIP of tracks + manifest.json')
  .addStringOption(o => o.setName('session_id').setDescription('Session ID').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Admins only (Manage Guild required).', ephemeral: true });
  }
  const id = interaction.options.getString('session_id');
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return interaction.reply({ content: 'Invalid session id format.', ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const session = Session.get(id);
  if (!session) return interaction.editReply('Session not found.');

  let sessionDir;
  try {
    sessionDir = safeJoin(CONFIG.AUDIO_DIR, id);
  } catch {
    return interaction.editReply('Invalid session path.');
  }
  if (!fs.existsSync(sessionDir)) return interaction.editReply('Session directory not found on disk.');

  const zipPath = path.join(CONFIG.AUDIO_DIR, 'exports', `${id}.zip`);
  await zipDirectory(sessionDir, zipPath);

  const file = new AttachmentBuilder(zipPath);
  await interaction.editReply({ content: `Export ready for **${id}**`, files: [file] });
}

async function zipDirectory(srcDir, zipPath) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    output.on('close', resolve);
    archive.pipe(output);
    archive.directory(srcDir, false); // include contents of session directory
    archive.finalize();
  });
}
