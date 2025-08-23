import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { startSession, getSession } from '../voice/index.js';

export const data = new SlashCommandBuilder()
  .setName('connect')
  .setDescription('Join and prepare to record in a voice channel')
  .addChannelOption(opt => opt.setName('channel').setDescription('Voice channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true));

export async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  if (getSession(interaction.guildId)) {
    await interaction.reply({ content: 'Already connected / session active.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  // Just join, actual recording session starts on /start
  await startSession({ client: interaction.client, guild: interaction.guild, channel, starterId: interaction.user.id, mode: 'lenient' });
  await interaction.editReply(`Connected to **${channel.name}**. Use /start to begin recording.`);
}
