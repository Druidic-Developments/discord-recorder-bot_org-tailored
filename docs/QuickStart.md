# Discord Recorder Quick Start

Welcome! This guide walks you through going from purchase to your first aligned multi-track recording session. Follow the steps in order for a smooth onboarding.

## 1. System Requirements

| Platform | Requirements |
| --- | --- |
| Windows 10/11 | Node.js 20 or newer, PowerShell 5+, audio interface capable of receiving Discord audio, outbound internet access |
| macOS 13+ | Node.js 20 or newer (via [Homebrew](https://brew.sh) or the official installer), Terminal access |
| Linux (Ubuntu 22.04+/Debian 12+) | Node.js 20 or newer, ALSA/PulseAudio, `build-essential` for native dependencies |

All platforms also need:

- A Discord bot application with **Privileged Gateway Intents** disabled (not needed for voice receive).
- FFmpeg — the bot bundles `ffmpeg-static` and works out of the box, but installing native FFmpeg keeps you future-proof.

## 2. Unpack the Distribution

1. Extract the archive you received into a folder where you want to host the bot.
2. Inside you will see:
   - `Start-Recorder.bat` and `start-app.ps1` helper launchers for Windows.
   - `docs/` with full manuals (this file).
   - `bot/` containing the Node.js source.
   - Optional `gui-build/` if you purchased a bundle including the desktop launcher.
   - `POLICY.md` — share this with your community so they understand how recordings work.
   - `.env.example` — template environment file you will fill out next.

## 3. Configure Discord Credentials

1. Create a copy of `.env.example` named `.env` in the same folder.
2. Open `.env` in a text editor and fill in:
   - `DISCORD_TOKEN` — the bot token from https://discord.com/developers/applications.
   - `CLIENT_ID` — the application (bot) ID.
   - Optional `GUILD_ID` or `GUILD_IDS` — guild IDs for fast command registration.
3. Save the file.

## 4. Install Dependencies

Open a terminal in the `bot/` folder and run:

```bash
npm install
```

This installs Discord.js, voice components, the SQLite engine, and the recording pipeline. On Windows, the packaged `Start-Recorder.bat` takes care of this during the first launch.

## 5. Register Slash Commands

Slash commands must be registered before the bot can respond in Discord. Run:

```bash
npm run register
```

If you set `GUILD_ID` or `GUILD_IDS`, commands appear instantly. Otherwise, global registration can take up to an hour. Re-run whenever you change commands.

## 6. Start the Recorder

Choose your preferred interface:

- **GUI (Windows/macOS/Linux)** — run `npm run gui` or, on Windows, double-click the packaged executable in `gui-build/`. The launcher walks you through `.env` setup, command registration, and starting the bot with live logs.
- **Command line** — run `npm start`. The bot logs its status and waits for slash command interactions.

When you see `✅ Logged in as <bot name>` the bot is online.

## 7. Run a Recording Session

1. In Discord, invite your bot with scopes `bot` and `applications.commands` and grant it Voice Connect/Speak permissions.
2. In a guild text channel, type:
   - `/consent opt_in` — each speaker must opt in at least once per guild.
   - `/connect` and choose the voice channel.
   - `/start` — recording begins immediately with sample-accurate padding.
3. Use `/stop` to finalise files. Recordings and manifests are saved to the directory configured by `AUDIO_DIR` (defaults to `recordings/`).

## 8. Export and Deliver

- `/export_session` produces a ZIP containing per-user tracks and `manifest.json`.
- `/delete_my_data` lets members enforce consent by removing their material.
- `/status` shows who is being recorded and aligned durations.

Refer to [docs/UserGuide.md](UserGuide.md) for deep dives into privacy, retention, and advanced admin tooling.

## 9. Keep It Updated

- Re-run `npm install` whenever you update the bot to pull new dependencies.
- Review `POLICY.md` after updates; changes trigger re-consent.
- Use `npm test` to validate functionality before recording critical sessions.

Happy recording!