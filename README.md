# Discord Recorder — Production-Ready, Consent-First Multi-Track Capture Suite

Deliver studio-grade Discord recordings with a turnkey package you can resell. This project bundles a hardened slash-command bot, a desktop launcher, and a full set of customer-facing manuals so buyers can get from checkout to capture without hand-holding.

- **Per-user aligned audio** with digital silence padding so every file lines up in the DAW.
- **Strict consent controls** that enforce opt-in and automated data deletion.
- **Export-ready manifests & ZIPs** for rapid delivery of podcast, webinar, or coaching sessions.
- **Commercial packaging workflow** that creates a clean distribution with documentation and checksums.

> **Tech stack:** Node.js 20+, discord.js v14, @discordjs/voice, ffmpeg, better-sqlite3, Electron (optional GUI).

## What's Included

| Component | Description |
| --- | --- |
| `bot/` | Core Node.js application with slash commands, session manager, SQLite storage, and export tooling. |
| `gui/` | Electron launcher (optional) that helps buyers configure `.env`, register commands, and start the bot. |
| `Start-Recorder.bat` / `start-app.ps1` | Windows launchers for customers who prefer guided setup. |
| `docs/` | Sales-ready documentation set: Quick Start, User Guide, Release Packaging playbook. |
| `POLICY.md` | Consent and privacy notice that the bot hashes to guarantee acceptance. |

## Getting Started (Developers)
npm install
cp .env.example .env  # fill DISCORD_TOKEN + CLIENT_ID
npm run register       # deploy slash commands
NODE_ENV=production npm start

Use `npm run gui` for the desktop launcher during local demos.

## Building a Sellable Release

1. **Run tests**: `npm test`
2. **(Optional) Build GUI**: `npm run build:win` (produces `dist/` portable exe)
3. **Package**: `npm run package:release`
4. Distribute the contents of `release/Discord-Recorder-v<version>/`

The packaging script copies the bot source, lockfiles, storage schema, launchers, docs, policy, `.env` template, and GUI build (if present). It also generates `SHA256SUMS.txt` for integrity verification. See [docs/ReleasePackaging.md](docs/ReleasePackaging.md) for the full playbook.

## Customer Experience

Point buyers to the documentation set inside the release:

- [docs/QuickStart.md](docs/QuickStart.md) — step-by-step onboarding from archive to first recording.
- [docs/UserGuide.md](docs/UserGuide.md) — deep dive into commands, consent, exports, and maintenance.
- `POLICY.md` — privacy commitments and consent terms.

Customers launch the bot via `Start-Recorder.bat`, `start-app.ps1`, or `npm start`, register slash commands with `/register`, and operate sessions with `/consent`, `/connect`, `/start`, `/stop`, `/export_session`, etc.

## Feature Highlights

- **Sample-accurate alignment**: 48 kHz clocking, per-user writers, silence padding, manifest segments.
- **Robust consent flow**: `/consent`, `/delete_my_data`, policy hashing, retention pruning.
- **Operational tooling**: `/status`, `/set_output`, `/set_retention`, `/set_alignment`, `/set_pad_after_optout`.
- **Automated exports**: zipped deliveries with per-user tracks and metadata.
- **Retention service**: background task purges expired data according to `RETENTION_DAYS`.

## Development Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run the bot from source. |
| `npm run dev` | Start with file watch for development. |
| `npm run register` | Register slash commands (global or guild-scoped). |
| `npm run gui` | Launch the Electron desktop assistant. |
| `npm run build:win` | Build a portable Windows GUI executable via electron-builder. |
| `npm run package:release` | Assemble a distribution-ready release with docs and checksums. |
| `npm test` | Run Vitest unit tests. |

## Folder Structure

```
root
├─ src/                 # bot source code, commands, voice pipeline, GUI
├─ docs/                # customer-ready manuals
├─ storage/schema.sql   # SQLite schema
├─ Start-Recorder.bat   # Windows helper launcher
├─ start-app.ps1        # PowerShell helper launcher
├─ POLICY.md            # Consent and privacy policy template
├─ .env.example         # Configuration template for sellers and buyers
└─ release/             # Generated distribution bundles (gitignored)
```

## Support & Customization Tips

- Offer installation assistance by bundling remote sessions or tutorial videos alongside the docs.
- Provide a branded version by editing the Electron window title and packaging assets under `src/gui/`.
- Adjust default encoding/bitrate in `.env.example` if your audience prefers WAV or FLAC.
- Keep slash command scopes minimal by specifying `GUILD_IDS` for VIP customers who want instant command availability.

## License & Compliance

See **POLICY.md** for the plain‑language policy and version notes.
This repository does not ship with an OSS license by default. Apply your own commercial license terms before distributing builds. Update `POLICY.md` to match your jurisdiction and business requirements.