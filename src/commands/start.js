import { SlashCommandBuilder } from 'discord.js';
import { getSession } from '../voice/index.js';
import { Consent, getPolicyHash, Session } from '../storage/db.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Start a recording session')
  .addStringOption(o => o.setName('mode')
    .setDescription('strict: all present must be opted-in; lenient: record opted-in only')
    .addChoices({name:'strict', value:'strict'}, {name:'lenient', value:'lenient'})
    .setRequired(true));

export async function execute(interaction) {
  const mode = interaction.options.getString('mode');
  const session = getSession(interaction.guildId);
  if (!session) return interaction.reply({ content: 'Use /connect first.', ephemeral: true });

  // Recreate with correct mode if needed
  session.mode = mode;

  // Public notice
  const policyHash = getPolicyHash();
  const consenting = [...session.presentUsers].filter(uid => Consent.isConsented(uid, interaction.guildId, policyHash));
  await interaction.reply({
    content: `📣 **Recording started** (mode: **${mode}**). Consenting: ${consenting.map(id=>`<@${id}>`).join(', ') || '(none)'}
Others are **not recorded**.`,
    ephemeral: false
  });

  // Persist session row
  Session.create({
    id: session.sessionId,
    guildId: interaction.guildId,
    channelId: session.channel.id,
    starterId: interaction.user.id,
    mode,
    policyHash,
    alignmentMode: session.alignmentMode,
    retentionDays: interaction.client.config.RETENTION_DAYS
  });

  // Confirmation
  await interaction.followUp({ content: `Session **${session.sessionId}** started.`, ephemeral: true });
}
