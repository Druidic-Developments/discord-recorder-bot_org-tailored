import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import { getPolicyHash } from '../storage/db.js';

export const data = new SlashCommandBuilder()
  .setName('policy')
  .setDescription('Display the current recording policy & retention');

export async function execute(interaction) {
  const text = fs.readFileSync('POLICY.md','utf-8');
  const hash = getPolicyHash();
  await interaction.reply({ content: `**Policy hash:** \`${hash}\`\n\n${text}`, ephemeral: true });
}
