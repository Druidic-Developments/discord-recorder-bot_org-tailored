import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CONFIG } from '../../config.js';

export const data = new SlashCommandBuilder()
  .setName('set_retention')
  .setDescription('[Admin] Set retention days')
  .addIntegerOption(o => o.setName('days').setDescription('Number of days').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Admins only (Manage Guild required).', ephemeral: true });
  }
  const days = interaction.options.getInteger('days');
  interaction.client.config.RETENTION_DAYS = days;
  await interaction.reply({ content: `Retention set to **${days}** day(s).`, ephemeral: true });
}
