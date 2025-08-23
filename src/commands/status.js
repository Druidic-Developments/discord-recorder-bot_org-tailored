import { SlashCommandBuilder } from 'discord.js';
import { getSession } from '../voice/index.js';
import { Consent, getPolicyHash } from '../storage/db.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Show session state and roster');

export async function execute(interaction) {
  const session = getSession(interaction.guildId);
  if (!session) return interaction.reply({ content: 'No active session.', ephemeral: true });

  const policyHash = getPolicyHash();
  const roster = [...session.presentUsers].map(uid => ({
    id: uid,
    consent: Consent.isConsented(uid, interaction.guildId, policyHash)
  }));
  const lines = roster.map(r => `• <@${r.id}> — ${r.consent ? '✅ consented' : '❌ not consented'}`);
  await interaction.reply({
    content: `**Session**: ${session.sessionId}
**Mode**: ${session.mode}
**Alignment**: ${session.alignmentMode}
**Consenting so far**:
${lines.join('\n') || '(none)'}
`,
    ephemeral: true
  });
}
