import { PermissionFlagsBits } from 'discord.js';
import { getSession } from '../voice/index.js';
import { getPolicyHash, Consent } from '../storage/db.js';

export function requireAdmin(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    throw new Error('Admin only: requires Manage Server permission.');
  }
}

export function policyHash() { return getPolicyHash(); }

export function isConsented(userId, guildId) {
  return Consent.isConsented(userId, guildId, policyHash());
}

export function ensureNoActiveSession(interaction) {
  if (getSession(interaction.guildId)) throw new Error('A session is already active.');
}
