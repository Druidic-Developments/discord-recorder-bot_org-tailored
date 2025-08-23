# Discord Recorder — Consent‑First, Sample‑Aligned, Per‑User Tracks

This is a production‑ready Discord bot that records **one file per consenting user** and guarantees **sample‑accurate timeline alignment** across every track. Late join? We **prefill digital silence** from `/start` to join. Mid‑session leave? We **continue silence** to `/stop`. Not speaking? Silence is written to keep continuity.

> Default tech: **Node.js 20+, discord.js v14 + @discordjs/voice + prism‑media + ffmpeg**.  
> We use Node because vanilla `discord.py` does not officially support voice receive in a stable, cross‑platform way; Node's voice receiver is robust and well‑supported for real‑time capture.

## Features
- **Consent‑first**: `/consent opt_in` required per guild. No audio is captured/written for non‑consenting members—ever.
- **Per‑user, aligned tracks** at 48 kHz PCM with 20 ms (960‑sample) frame cadence and a session clock.
- **Silence padding** for late join / mid‑leave / jitter to ensure identical final durations.
- **Export**: `/export_session` zips all tracks + `manifest.json` (segments with speech/silence windows).
- **Privacy & compliance**: Policy hashing, `/delete_my_data`, retention pruning, public notices.
- **Config via `.env`** and runtime admin commands.

## Quick Start (Windows/macOS/Linux)
1. **Install prerequisites**
   - Node.js 20+
   - ffmpeg (we use `ffmpeg-static` to bundle a binary for most platforms, but native ffmpeg is fine)
2. **Clone & install**
   ```bash
   npm install
   cp .env.example .env
   # Fill in DISCORD_TOKEN and CLIENT_ID (and GUILD_ID for faster per-guild command deploy)
   ```
3. **Register slash commands**
   ```bash
   npm run register
   ```
4. **Run the bot**
   ```bash
   npm start
   ```
5. **Invite the bot** with scopes `bot applications.commands` and permissions:
   - Connect, Speak, View Channels, Use Voice Activity
   - Manage Messages (for status), Attach Files (for export), Read Message History

## Slash Commands
- `/connect channel:<voice>` — Join a voice channel.
- `/start mode:<strict|lenient>` — Start a session clock and begin aligned recording.
- `/stop` — Finalize, encode, and store files.
- `/consent <opt_in|opt_out>` — Toggle consent. Policy & receipt are DM’d.
- `/status` — Show session state, alignment mode, consenting roster and per‑user durations so far.
- `/policy` — Show POLICY and current policy hash.
- `/delete_my_data` — Delete all recordings + metadata for you (this guild). Manifests keep redacted placeholders.
- **Admin:**
  - `/export_session session_id:<id>` — Zip per‑user files + manifest.json.
  - `/set_retention days:<int>` — Set retention days.
  - `/set_output format:<mp3|wav|flac> bitrate:<int?>` — Change output encoding.
  - `/set_alignment <pad|truncate>` — Alignment policy. (See POLICY.)
  - `/set_pad_after_optout <true|false>` — Whether to continue padding after mid‑session opt‑out.

## Architecture
- **Session clock**: a 48 kHz sample clock with 20 ms ticks aligns every user’s frames.
- **Per‑user writers**: each user has a PCM writer that tracks `writtenSamples`; we pad zeros on any gap.
- **Segments manifest**: we record `[{type: 'silence'|'speech', start_ms, end_ms}]` for each user.
- **Encoding**: raw PCM → `ffmpeg` → MP3 128 CBR by default (configurable WAV/FLAC/MP3).
- **SQLite**: consents, sessions, tracks. See `storage/schema.sql`.

## Troubleshooting
- **No audio files?** Ensure you ran `/consent opt_in` and `/start` *after* `/connect`. In strict mode, all present users must consent.
- **Windows Opus issues**: `@discordjs/opus` is bundled; ensure Node 20+.
- **FFmpeg not found**: We bundle `ffmpeg-static`, but if path issues arise, install ffmpeg and add to PATH.

## Tests
Run unit tests:
```bash
npm test
```

## Security & Privacy
- The bot never records DMs or Group DMs.
- We store a hash of `POLICY.md`; any change forces re‑consent.
- `/delete_my_data` removes media & metadata; manifests keep redacted placeholders.
- Retention service prunes old files and DB rows.

See **POLICY.md** for the plain‑language policy and version notes.
