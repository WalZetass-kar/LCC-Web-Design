// API Service untuk komunikasi Developer Panel <-> User Panel
import { db } from '../database/connection';
import { mediasoft_pengguna, mediasoft_identitas } from '../database/schema';
import { eq } from 'drizzle-orm';

export interface LicenseInfo {
  id: string;
  userId: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'suspended';
  expiresAt: Date;
  maxUsers: number;
  maxProducts: number;
  features: string[];
}

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
}

export interface StoreInfo {
  id: number;
  nama: string;
  alamat: string;
  telepon: string;
  email: string;
  licenseKey?: string;
  licenseStatus?: string;
}

// Developer Panel Functions
export const DeveloperAPI = {
  // Get all user accounts
  async getAllUsers(): Promise<UserAccount[]> {
    const users = await db.select().from(mediasoft_pengguna).all();
    return users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email || '',
      role: u.role,
      status: u.status as any,
      createdAt: new Date(u.created_at)
    }));
  },

  // Suspend/Activate user account
  async updateUserStatus(userId: number, status: 'active' | 'inactive' | 'suspended') {
    await db.update(mediasoft_pengguna)
      .set({ status, updated_at: new Date().toISOString() })
      .where(eq(mediasoft_pengguna.id, userId))
      .run();
  },

  // Get store info
  async getStoreInfo(): Promise<StoreInfo | null> {
    const store = await db.select().from(mediasoft_identitas).get();
    if (!store) return null;
    
    return {
      id: store.id,
      nama: store.nama_toko,
      alamat: store.alamat,
      telepon: store.telepon,
      email: store.email,
      licenseKey: store.license_key,
      licenseStatus: store.license_status
    };
  },

  // Update license for store
  async updateLicense(licenseKey: string, status: string, expiresAt: Date) {
    await db.update(mediasoft_identitas)
      .set({
        license_key: licenseKey,
        license_status: status,
        license_expires_at: expiresAt.toISOString()
      })
      .run();
  },

  // Revoke license
  async revokeLicense() {
    await db.update(mediasoft_identitas)
      .set({
        license_status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .run();
  },

  // Get license info
  async getLicenseInfo(): Promise<LicenseInfo | null> {
    const store = await db.select().from(mediasoft_identitas).get();
    if (!store || !store.license_key) return null;

    return {
      id: store.license_key,
      userId: store.id.toString(),
      plan: (store.license_plan || 'free') as any,
      status: (store.license_status || 'expired') as any,
      expiresAt: store.license_expires_at ? new Date(store.license_expires_at) : new Date(),
      maxUsers: store.max_users || 1,
      maxProducts: store.max_products || 100,
      features: store.features ? JSON.parse(store.features) : []
    };
  },

  // Update license plan
  async updateLicensePlan(plan: string, maxUsers: number, maxProducts: number, features: string[]) {
    await db.update(mediasoft_identitas)
      .set({
        license_plan: plan,
        max_users: maxUsers,
        max_products: maxProducts,
        features: JSON.stringify(features),
        updated_at: new Date().toISOString()
      })
      .run();
  }
};

// User Panel Functions
export const UserAPI = {
  // Check license status
  async checkLicense(): Promise<{ valid: boolean; message: string; info?: LicenseInfo }> {
    const license = await DeveloperAPI.getLicenseInfo();
    
    if (!license) {
      return { valid: false, message: 'No license found' };
    }

    if (license.status === 'suspended' || license.status === 'expired') {
      return { valid: false, message: `License ${license.status}`, info: license };
    }

    if (new Date() > license.expiresAt) {
      return { valid: false, message: 'License expired', info: license };
    }

    return { valid: true, message: 'License active', info: license };
  },

  // Get current user limits
  async getUserLimits() {
    const license = await DeveloperAPI.getLicenseInfo();
    if (!license) {
      return { maxUsers: 1, maxProducts: 100, features: [] };
    }

    return {
      maxUsers: license.maxUsers,
      maxProducts: license.maxProducts,
      features: license.features
    };
  }
};
