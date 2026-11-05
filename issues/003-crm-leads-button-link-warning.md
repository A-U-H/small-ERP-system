# Issue 003 — Base UI button-semantics warning on `/crm/leads` (duplicate of 001)

- **Module/Page:** CRM — `/crm/leads` ("New lead" `ButtonLink`)
- **Priority:** Low
- **Status:** fixed
- **Date:** 2026-08-07

## Description

Identical to [Issue 001](001-base-ui-button-link-console-warning.md) — same root cause, another page. The `ButtonLink` at `src/app/(app)/crm/leads/page.tsx:51` renders a Base UI `Button` with `render={<Link/>}`, and because `nativeButton` defaults to `true`, Base UI logs:

> Base UI: A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true. Rendering a non-`<button>` removes native button semantics, which can impact forms and accessibility. Use a real `<button>` in the `render` prop, or set `nativeButton` to `false`.

## Steps to reproduce

1. Run `npm run dev`.
2. Log in with admin credentials.
3. Open `/crm/leads`.
4. Open the browser devtools console.

## Expected

No console warning.

## Actual

The Base UI warning is logged for `ButtonLink` on `LeadsPage`.

## Relationship to Issues 001/002

Same defect (global `ButtonLink` component). Fixing `src/components/ui/button-link.tsx` (e.g. `nativeButton={false}`) resolves 001, 002, 003, and every other page using `ButtonLink`.

## Resolution

Fixed with issue 001: `nativeButton={false}` added to `ButtonLink` in `src/components/ui/button-link.tsx`.
