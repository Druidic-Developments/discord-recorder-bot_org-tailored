import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CONFIG } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('set_output')
  .setDescription('[Admin] Set output format/bitrate')
  .addStringOption(o => o.setName('format').setDescription('mp3|wav|flac').setRequired(true))
  .addIntegerOption(o => o.setName('bitrate').setDescription('kbps for mp3').setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Admins only (Manage Guild required).', ephemeral: true });
  }
  const fmt = interaction.options.getString('format');
  const br = interaction.options.getInteger('bitrate');
  interaction.client.config.OUTPUT_FORMAT = fmt;
  if (br) interaction.client.config.BITRATE = br;
  await interaction.reply({ content: `Output set: **${fmt}** ${br?br+' kbps':''}`, ephemeral: true });
}
