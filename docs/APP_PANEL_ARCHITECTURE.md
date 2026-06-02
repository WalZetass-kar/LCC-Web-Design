# App Panel Architecture

## Route Boundaries

- `/app` is the User Panel / POS App.
- `/developer` is the Developer Panel.
- `/login` is the shared login entry.
- `/license` redirects to `/app/payment` for license payment and activation flow.

Legacy routes such as `/produk`, `/transaksi`, `/payment`, and `/license-admin`
are preserved as redirects so old deep links do not break.

## Source Boundaries

- `src/apps/user-panel` contains User Panel route composition.
- `src/apps/developer-panel` contains Developer Panel shell and route composition.
- `src/apps/routing` contains frontend route guards.
- `src/shared/config/rbac.ts` contains shared role rules used by frontend and backend.
- `src/platform/desktop` documents the Electron desktop platform boundary.
- `src/platform/mobile` documents the Capacitor mobile platform boundary.
- `src/platform/web` documents the shared Vite web output boundary.

Existing feature pages remain in `src/renderer/pages` to avoid risky large-file
moves. They are mounted into the correct panel through the new app route modules.

## RBAC

User Panel roles:

- developer
- super_admin
- admin
- operator
- kasir
- demo

Operational admin channels are available to `admin`, `super_admin`, and
`developer` roles, subject to feature flags:

- backup
- activity log
- ecommerce API

Developer Panel routes and license/system management IPC channels require
`developer` or `super_admin`.

The frontend guards protect routes, and `src/backend/middleware/demoGuardV2.ts`
protects IPC/backend access so a user cannot bypass the menu by typing a URL.
