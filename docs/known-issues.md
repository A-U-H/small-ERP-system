# Known issues

Bugs found during testing are logged in [`issues/`](../issues/) as markdown files. All reported issues are currently **fixed**.

## Fix log

| Issue | Problem | Fix |
|-------|---------|-----|
| [001](../issues/001-base-ui-button-link-console-warning.md)–[009](../issues/009-team-members-button-link-warning.md) | Base UI console warning on every page using `ButtonLink` (renders a `<Link>` while `nativeButton` defaults to true) | Added `nativeButton={false}` to `ButtonLink` in `src/components/ui/button-link.tsx` (issues 001–009 were the same root cause across pages: invoices, companies, leads, contacts, deals, proposals, projects, templates, members) |
| [010](../issues/010-team-time-invalid-orderby.md) | `/team/time` threw `PrismaClientValidationError`: `orderBy` given as an object for two fields | Changed to `orderBy: [{ projectId: "asc" }, { name: "asc" }]` in `src/app/(app)/team/time/page.tsx` |

All fixes verified with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and live authenticated requests against the dev server.

## Outstanding work (not bugs — not yet implemented)

These were flagged during development as known gaps:

- **Password-change UI** — users cannot change their own password in-app yet; change the hash in the DB until built.
- **Invoice PDF generation** — no PDF rendering; `pdfUrl`/`signedPdfUrl` fields exist but are unused.
- **Email (Resend) & WhatsApp dispatch** — `RESEND_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` env vars exist, but no client is wired; proposals/invoices/notifications are not sent.
- **Per-user notification preferences UI** — `UserNotificationPref` table exists; only global `NotificationSetting` rows are seeded (no UI to manage either).
- **File storage** — `Attachment.receiptUrl`/`url` fields exist but there's no upload flow.

## Known platform quirks (not product bugs)

- Windows: use `npm.cmd`/`npx.cmd` in PowerShell (bare `npm` can open an app-picker if an empty `C:\Windows\System32\npm` file shadows the real one).
- Supabase: use the **session pooler** host for `DATABASE_URL` — the direct host is IPv6-only on some networks.
- Google Fonts are blocked on this network; the app uses bundled Geist via `next/font`.

## Reporting new issues

When you find something during testing, log it in `issues/NNN-short-title.md` with: module/page, priority, status, steps to reproduce, expected vs actual, and cross-references to related issues.
