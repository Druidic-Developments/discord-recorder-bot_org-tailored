# Release Packaging Playbook

Use this checklist every time you cut a commercial build of the Discord Recorder. Following these steps ensures customers receive a clean, well-documented product that works out of the box.

## 1. Pre-flight Checks

1. **Update version:** bump `version` in `package.json` and tag your release in source control.
2. **Review docs:** update `README.md`, `docs/*.md`, and `POLICY.md` to reflect any new features or compliance requirements.
3. **Dependency audit:** run `npm outdated` and review changelogs for security-impacting updates.
4. **Clean workspace:** delete any previous `release/` and `dist/` folders to avoid stale files.

## 2. Run Automated Tests

```bash
npm test
```

Fix any failures before shipping. Tests guard against regressions in consent handling, timeline alignment, and storage.

## 3. Build the Optional Desktop Launcher

If your package tier includes the Electron GUI:

```bash
npm run build:win
```

- Run this command on Windows to produce a portable `.exe` under `dist/`.
- macOS/Linux builds can be generated with the relevant `electron-builder` targets; add scripts if you plan to distribute them.
- Verify the executable launches and can start/stop the bot locally.

## 4. Create the Release Bundle

```bash
npm run package:release
```

The packaging script performs the following:

- Reads the current version from `package.json`.
- Creates `release/Discord-Recorder-v<version>/`.
- Copies source files into `bot/`, includes `storage/schema.sql`, and preserves lockfiles for deterministic installs.
- Copies `.env.example`, launcher scripts, and policy into the release root.
- Bundles the latest `dist/` folder (if present) into `gui-build/`.
- Mirrors the `docs/` directory for customers.
- Generates `SHA256SUMS.txt` so you can publish hashes for integrity checks.

If the script reports missing artifacts (e.g., no `dist/`), resolve them before distributing the archive.

## 5. Sanity Test the Bundle

1. Extract the contents of `release/Discord-Recorder-v<version>.zip` to a fresh folder.
2. Follow `docs/QuickStart.md` end-to-end on Windows and at least one Unix-like platform.
3. Confirm you can register commands, start a recording, and export a session.

## 6. Deliver to Customers

- Compress the release folder (`.zip` for Windows users, `.tar.gz` for Unix).
- Publish the archive, `SHA256SUMS.txt`, and updated documentation wherever you sell the product.
- Provide buyers with instructions on where to find product updates and support.

## 7. Post-release Maintenance

- Monitor Discord API changelogs and update dependencies proactively.
- Keep `POLICY.md` accurate; regulatory shifts may require revisions.
- Record customer feedback to prioritise future improvements.

Following this playbook transforms the repository into a professional, repeatable deliverable ready for sale.