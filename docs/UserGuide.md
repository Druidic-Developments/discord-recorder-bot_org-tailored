# Discord Recorder User Guide

This manual explains how to operate the Discord Recorder as a production tool. It is intended for studio owners, podcast producers, and moderators running high-stakes sessions where alignment and consent compliance matter.

## 1. Product Overview

- **Purpose** — capture one audio file per consenting speaker with sample-perfect alignment across all tracks.
- **Technology stack** — Node.js 20+, discord.js v14, @discordjs/voice, ffmpeg, better-sqlite3.
- **Storage layout** — default `recordings/` directory containing per-session folders with track WAV/MP3/FLAC files plus a `manifest.json` describing speech/silence segments.

## 2. Credential & Policy Management

1. Create or reuse a Discord application and enable the Bot feature.
2. Copy the bot token into your `.env` file (`DISCORD_TOKEN`). Treat this like a password.
3. Copy the Application ID into `.env` (`CLIENT_ID`).
4. Share `POLICY.md` with anyone using your Discord. The bot hashes this document; any change forces members to re-consent.
5. If you change policy terms, bump the version number at the top of `POLICY.md` and communicate the update.

## 3. Running the Bot

### 3.1 From the Command Line

```bash
npm start
```

- The first boot prints the effective configuration and ensures your output directories exist.
- Logs stream to STDOUT. Use a process manager (`pm2`, `systemd`, Windows Task Scheduler) for unattended production use.

### 3.2 From the Desktop Launcher

- Run `npm run gui` from the project root, or open the packaged executable found under `gui-build/` (if included in your release).
- The launcher performs pre-flight checks: Node/FFmpeg availability, `.env` completeness, and guild list.
- You can trigger command registration or start/stop the bot process with buttons and watch logs inside the window.

## 4. Slash Commands & Workflow

| Command | Role | Description |
| --- | --- | --- |
| `/consent opt_in` | Members | Required before any personal audio is captured. Stored per guild. |
| `/consent opt_out` | Members | Stops future captures; optionally zero-pads to maintain alignment if `PAD_AFTER_OPTOUT` is true. |
| `/connect` | Admins | Selects a voice channel and prepares the recorder. No audio written until `/start`. |
| `/start` | Admins | Begins aligned recording with the selected mode (`pad` or `truncate`). |
| `/stop` | Admins | Finalises writers, encodes files, and resets the session clock. |
| `/status` | Admins | Lists consenting users, session duration, and last frame times. |
| `/policy` | Everyone | Sends the current policy text and hash. |
| `/delete_my_data` | Members | Immediately removes recordings and metadata for the requesting user. |
| `/export_session` | Admins | Produces a ZIP under `recordings/exports/` for easy distribution. |
| `/set_retention` | Admins | Updates automatic deletion days (default 30). |
| `/set_output` | Admins | Switches between mp3/wav/flac and optional bitrate. |
| `/set_alignment` | Admins | Chooses how to handle missing frames: pad with silence or truncate to last heard sample. |
| `/set_pad_after_optout` | Admins | Controls whether a user who opts out mid-session continues to receive silence padding. |

## 5. Consent & Privacy Guarantees

- Only users who have opted in are recorded.
- The system writes digital silence for anyone who is connected but silent so final files share identical duration.
- If a user leaves mid-session, the recorder continues padding their track with silence to keep alignment intact.
- `/delete_my_data` is irrevocable. The manifest retains anonymised placeholders to preserve session history without audio.
- `RETENTION_DAYS` automatically prunes recordings older than the configured window.

## 6. Monitoring & Logs

- All operations print structured `[Tag]` logs. Watch for `[Warn]` and `[Error]` messages.
- Use `/status` frequently during long sessions to confirm alignment and consent state.
- The retention task runs hourly to remove expired material; successful deletions are logged.

## 7. Recording Output

- Files are saved under `${AUDIO_DIR}/sessions/<sessionId>/<userId>.<ext>`.
- `manifest.json` outlines speech and silence windows per user and stores session metadata (start time, duration, alignment mode).
- Use `/export_session` to collect all assets plus the manifest into a timestamped ZIP under `${AUDIO_DIR}/exports`.

## 8. Maintenance Checklist

- **Before each session** — confirm `.env` values, run `/register` to update slash commands, and test `/consent` flow in a staging guild.
- **After each release** — run `npm test`, review docs, and repackage with `npm run package:release`.
- **For backups** — snapshot the `recordings/` directory and `storage/recorder.sqlite3` database.

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Bot refuses to join or record | Check it has Voice Connect/Speak permissions and the voice channel has enough slots. |
| Slash commands missing | Run `npm run register` after confirming `CLIENT_ID` and guild IDs. Allow up to an hour for global commands. |
| No files after `/stop` | Ensure every speaker ran `/consent opt_in` prior to `/start`. In strict mode (pad), all present members must consent. |
| FFmpeg errors | Install native FFmpeg and ensure it is in PATH; otherwise remove conflicting binaries so `ffmpeg-static` is used. |
| SQLite locking | Avoid sharing the same recordings directory between multiple instances; run one bot per dataset. |

For packaging and resale instructions, see [ReleasePackaging.md](ReleasePackaging.md).