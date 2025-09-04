import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('set_pad_after_optout')
  .setDescription('[Admin] Continue padding after user opts out?')
  .addBooleanOption(o => o.setName('enabled').setDescription('true|false').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Admins only (Manage Guild required).', ephemeral: true });
  }
  const enabled = interaction.options.getBoolean('enabled');
  interaction.client.config.PAD_AFTER_OPTOUT = enabled;
  await interaction.reply({ content: `pad_after_optout set to **${enabled}**`, ephemeral: true });
}
