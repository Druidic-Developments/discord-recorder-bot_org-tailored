import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { stopSession } from '../voice/index.js';
import { Session, Track } from '../storage/db.js';
import { CONFIG } from '../config.js';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop recording and finalize files');

export async function execute(interaction) {
  await interaction.deferReply();
  const { sessionId, results, session } = await stopSession(interaction.guildId);
  Session.end(sessionId);

  // Persist tracks
  for (const r of results) {
    Track.insert({
      sessionId,
      userId: r.userId,
      username: r.username,
      path: r.path,
      durationMs: r.durationMs,
      sha256: r.sha256,
      bytes: r.bytes,
      firstOffsetMs: r.firstOffsetMs || 0
    });
  }

  // Build manifest.json
  const manifest = {
    session: {
      id: sessionId,
      guild_id: interaction.guildId,
      channel_id: session.channel.id,
      start_ts: new Date().toISOString(), // approximate; DB holds exact
      end_ts: new Date().toISOString(),
      alignment_mode: session.alignmentMode,
      sample_rate_hz: 48000,
      frame_ms: 20
    },
    tracks: results.map(r => ({
      user_id: r.userId,
      username: r.username,
      path: r.path,
      first_offset_ms: r.firstOffsetMs || 0,
      segments: r.segments
    }))
  };
  const manifestPath = path.join(session.sessionDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  await interaction.editReply(`✅ Session **${sessionId}** finalized. Use /export_session to download the ZIP.`);
}
