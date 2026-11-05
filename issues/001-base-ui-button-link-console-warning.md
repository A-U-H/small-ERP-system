# Issue 001 — Base UI console warning when `ButtonLink` renders a `Link`

- **Module/Page:** App-wide (all modules) — first observed on `/finance/invoices`
- **Priority:** Low
- **Status:** fixed
- **Date:** 2026-08-07

## Description

`ButtonLink` (`src/components/ui/button-link.tsx`) renders a Base UI `Button` with `render={<Link href={href} />}`, i.e. an `<a>` element. Base UI's `Button` primitive defaults `nativeButton` to `true`, so when the `render` prop produces a non-`<button>` element it logs a console warning:

> Base UI: A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true. Rendering a non-`<button>` removes native button semantics, which can impact forms and accessibility. Use a real `<button>` in the `render` prop, or set `nativeButton` to `false`.

The warning is a dev-only console message, but it fires on every page that uses a `ButtonLink` (e.g. "New invoice" on `/finance/invoices`, "New lead", "New project", etc.).

## Steps to reproduce

1. Run `npm run dev`.
2. Log in with admin credentials.
3. Open `/finance/invoices`.
4. Open the browser devtools console.

## Expected

No console warning. Link-styled buttons should render as anchors (correct for navigation) without triggering Base UI's button-semantics check.

## Actual

The Base UI warning is logged for `ButtonLink` on `InvoicesPage` (`src/app/(app)/finance/invoices/page.tsx:81`), and on any other page rendering a `ButtonLink`.

## Suggested fix (when addressing)

- Pass `nativeButton={false}` to the Base UI `ButtonPrimitive` when a custom `render` element is provided, or
- Set `nativeButton={false}` inside `ButtonLink` so Base UI knows the rendered element is not a native button.

Verify against `@base-ui/react` v1.7 Button API before applying.

## Resolution

Fixed 2026-08-07: added `nativeButton={false}` to the `Button` rendered by `ButtonLink` in `src/components/ui/button-link.tsx` (`<Button {...props} nativeButton={false} render={<Link href={href} />}>`). Plain `Button` usages keep native `<button>` semantics. Verified via `npx tsc --noEmit`, `npm run lint`, `npm run build`, and live dev-server requests (all affected pages return 200 with an authenticated session).
