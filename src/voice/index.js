import { RecordingSession } from './sessionManager.js';

export const ActiveSessions = new Map(); // guildId -> RecordingSession

export async function startSession({ client, guild, channel, starterId, mode }) {
  if (ActiveSessions.has(guild.id)) throw new Error('A session is already active in this guild.');
  const session = new RecordingSession({ client, guild, channel, starterId, mode });
  await session.connect();
  ActiveSessions.set(guild.id, session);
  return session;
}

export async function stopSession(guildId) {
  const session = ActiveSessions.get(guildId);
  if (!session) throw new Error('No active session');
  const results = await session.stopAndFinalize();
  ActiveSessions.delete(guildId);
  return { sessionId: session.sessionId, results, session };
}

export function getSession(guildId) {
  return ActiveSessions.get(guildId);
}
