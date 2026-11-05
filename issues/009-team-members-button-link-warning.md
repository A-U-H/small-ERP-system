# Issue 009 — Base UI button-semantics warning on `/team/members` (duplicate of 001)

- **Module/Page:** Team — `/team/members` ("Add member" `ButtonLink`)
- **Priority:** Low
- **Status:** fixed
- **Date:** 2026-08-07

## Description

Identical to [Issue 001](001-base-ui-button-link-console-warning.md) — same root cause, another page. The `ButtonLink` at `src/app/(app)/team/members/page.tsx:66` renders a Base UI `Button` with `render={<Link/>}`, and because `nativeButton` defaults to `true`, Base UI logs:

> Base UI: A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true. Rendering a non-`<button>` removes native button semantics, which can impact forms and accessibility. Use a real `<button>` in the `render` prop, or set `nativeButton` to `false`.

## Steps to reproduce

1. Run `npm run dev`.
2. Log in with admin credentials.
3. Open `/team/members`.
4. Open the browser devtools console.

## Expected

No console warning.

## Actual

The Base UI warning is logged for `ButtonLink` on `TeamMembersPage`.

## Relationship to Issues 001–008

Same defect (global `ButtonLink` component). Fixing `src/components/ui/button-link.tsx` (e.g. `nativeButton={false}`) resolves 001–009 and every other page using `ButtonLink`.

## Resolution

Fixed with issue 001: `nativeButton={false}` added to `ButtonLink` in `src/components/ui/button-link.tsx`. `/team/members` returns 200 with an authenticated session.
