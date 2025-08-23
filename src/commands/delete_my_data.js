import { SlashCommandBuilder } from 'discord.js';
import { Track, Consent } from '../storage/db.js';

export const data = new SlashCommandBuilder()
  .setName('delete_my_data')
  .setDescription('Delete all your recordings and metadata in this guild');

export async function execute(interaction) {
  const n = Track.deleteByUserInGuild({ userId: interaction.user.id, guildId: interaction.guildId });
  Consent.deleteUser(interaction.user.id, interaction.guildId);
  await interaction.reply({ content: `Deleted your data in this guild. Removed ${n} track file(s).`, ephemeral: true });
}
