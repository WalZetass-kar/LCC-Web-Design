/**
 * Entry point modul admin. Cukup import dari sini.
 *
 * Contoh:
 *
 *  import { AdminPanel, AdminGate, AdminLink } from './license/admin';
 *
 *  <AdminGate>
 *    <AdminPanel onExit={() => navigate('/')} />
 *  </AdminGate>
 */
export { AdminPanel } from './AdminPanel';
export { AdminGate, AdminLink, useIsAdmin } from './AdminGate';
export * as adminApi from './api';
