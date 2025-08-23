# Recording & Consent Policy — v2 (Organization-Tailored)

**Organization:** _<Druidic Development>_  
**Contact for privacy queries:** _privacy@yourorg.com_ (replace with your address)  
**Effective date:** _2025-23-08_

## What this bot does
- Records **one audio file per consenting participant** in a Discord voice channel.
- Guarantees **sample-accurate alignment** across all consenting tracks from `/start` to `/stop` using a 48 kHz session clock (20 ms frames).
- Fills any gaps (late join, mid-session leave, silence while present) with **digital silence**, so files line up in your DAW.

## Consent-first
- We **only** record members who explicitly run `/consent opt_in` in this guild _under the current policy version_.
- Non-consenting members are **never** captured, decoded, or written to disk.
- If this policy changes, the policy hash is updated and **all users must re-opt-in** before any further recording.

## Alignment modes
- `pad` (default): Every consenting user’s file spans the full session from `/start` to `/stop`.
- `truncate`: Only write while the participant is present; we store `first_offset_ms` in the manifest for DAW alignment.
- Admins can switch via `/set_alignment` per guild.

## Opt-out & mid-session behavior
- `/consent opt_out` stops capture immediately.
- By default, after opt-out we **do not** continue padding (`pad_after_optout=false`). Admins can enable continued padding via `/set_pad_after_optout true` if strict alignment for post is required.

## What we store
- **Consent**: user id, guild id, consent flag, policy hash, timestamp.
- **Sessions**: id, guild/channel ids, starter id, mode, policy hash, start/end timestamps, alignment mode, retention days at time of recording.
- **Tracks**: per-user file path, duration, SHA-256 checksum, size, `first_offset_ms` (when `truncate`), and a **segments manifest** noting speech vs. silence windows for transparency.
- **No DMs/Group DMs** are recorded.

## Retention (default: 30 days)
- Media files and related metadata are retained for **30 days** by default, after which they are automatically deleted.
- Admins may adjust per guild with `/set_retention days:<int>` to meet project or legal needs.
- Users can run `/delete_my_data` at any time to purge their media and metadata in this guild. Manifests keep redacted placeholders where applicable.

## Your rights & transparency
- Participants can view this policy at any time with `/policy`.
- On `/consent opt_in`, we DM this policy (or a link) and the current policy hash. We log consent with timestamp.
- If local law grants access, correction, deletion, or portability rights (e.g., GDPR/CCPA), contact _privacy@yourorg.com_ and include your Discord user id and the guild.

## Security notes
- Files are stored on the host the bot runs on (or its mounted storage). Ensure the host is access-controlled and regularly patched.
- We compute a SHA-256 for each exported track to support integrity verification.
- Consider restricting who may run admin commands to server managers only.

## Changes to this policy
- Version: **v2**. A change updates the policy hash and will require **re-consent** from participants before recording continues.

---
**Summary:** We record **only** consenting members, keep tracks fully aligned, and default to **30-day** retention. You can opt out at any time with `/consent opt_out` or purge data with `/delete_my_data`.
