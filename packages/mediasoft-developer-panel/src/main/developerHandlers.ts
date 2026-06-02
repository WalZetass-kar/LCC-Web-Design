// IPC Handlers untuk Developer Panel
import { ipcMain } from 'electron';
import { DeveloperAPI } from '@mediasoft/shared-lib/services/crossAppApi';

export function registerDeveloperHandlers() {
  // Get all users
  ipcMain.handle('developer:getAllUsers', async () => {
    return await DeveloperAPI.getAllUsers();
  });

  // Update user status
  ipcMain.handle('developer:updateUserStatus', async (_, { userId, status }) => {
    return await DeveloperAPI.updateUserStatus(userId, status);
  });

  // Get store info
  ipcMain.handle('developer:getStoreInfo', async () => {
    return await DeveloperAPI.getStoreInfo();
  });

  // Get license info
  ipcMain.handle('developer:getLicenseInfo', async () => {
    return await DeveloperAPI.getLicenseInfo();
  });

  // Update license
  ipcMain.handle('developer:updateLicense', async (_, { licenseKey, status, expiresAt }) => {
    return await DeveloperAPI.updateLicense(licenseKey, status, new Date(expiresAt));
  });

  // Revoke license
  ipcMain.handle('developer:revokeLicense', async () => {
    return await DeveloperAPI.revokeLicense();
  });

  // Update license plan
  ipcMain.handle('developer:updateLicensePlan', async (_, { plan, maxUsers, maxProducts, features }) => {
    return await DeveloperAPI.updateLicensePlan(plan, maxUsers, maxProducts, features);
  });
}
