import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('set_alignment')
  .setDescription('[Admin] Set alignment mode: pad | truncate')
  .addStringOption(o => o.setName('mode').setDescription('pad|truncate').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const mode = interaction.options.getString('mode');
  interaction.client.config.ALIGNMENT_MODE = mode;
  await interaction.reply({ content: `Alignment mode set to **${mode}**`, ephemeral: true });
}
