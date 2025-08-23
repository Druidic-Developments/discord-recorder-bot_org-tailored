import { SlashCommandBuilder } from 'discord.js';
import { Consent, getPolicyHash } from '../storage/db.js';
import fs from 'fs';

export const data = new SlashCommandBuilder()
  .setName('consent')
  .setDescription('Opt in or out of recording for this guild')
  .addStringOption(o => o.setName('mode').setDescription('opt_in | opt_out')
    .addChoices({name:'opt_in', value:'opt_in'}, {name:'opt_out', value:'opt_out'}).setRequired(true));

export async function execute(interaction) {
  const mode = interaction.options.getString('mode');
  const policy = fs.readFileSync('POLICY.md','utf-8');
  const policyHash = getPolicyHash();
  const consent = mode === 'opt_in';
  Consent.upsert({ userId: interaction.user.id, guildId: interaction.guildId, consent, policyHash });

  try {
    await interaction.user.send(`Your consent in **${interaction.guild.name}** is now **${mode}**.
Policy hash: \`${policyHash}\`

${policy}`);
  } catch {}
  await interaction.reply({ content: `Your consent is now **${mode}** for this guild.`, ephemeral: true });
}
