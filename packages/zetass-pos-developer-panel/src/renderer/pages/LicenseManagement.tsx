import { useState, useEffect } from 'react';
import { Shield, Users, Package, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LicenseInfo {
  id: string;
  plan: string;
  status: string;
  expiresAt: Date;
  maxUsers: number;
  maxProducts: number;
  features: string[];
}

interface StoreInfo {
  id: number;
  nama: string;
  alamat: string;
  telepon: string;
  email: string;
  licenseKey?: string;
  licenseStatus?: string;
}

export default function LicenseManagement() {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storeData = await window.api.invoke('developer:getStoreInfo');
      const licenseData = await window.api.invoke('developer:getLicenseInfo');
      setStore(storeData);
      setLicense(licenseData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateLicense = async () => {
    const licenseKey = prompt('Enter License Key:');
    if (!licenseKey) return;

    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year

      await window.api.invoke('developer:updateLicense', {
        licenseKey,
        status: 'active',
        expiresAt: expiresAt.toISOString()
      });

      alert('License activated successfully!');
      loadData();
    } catch (error) {
      alert('Failed to activate license');
    }
  };

  const suspendLicense = async () => {
    if (!confirm('Suspend this license? User app will be blocked.')) return;

    try {
      await window.api.invoke('developer:updateLicense', {
        licenseKey: license?.id,
        status: 'suspended',
        expiresAt: license?.expiresAt
      });

      alert('License suspended');
      loadData();
    } catch (error) {
      alert('Failed to suspend license');
    }
  };

  const revokeLicense = async () => {
    if (!confirm('Revoke this license permanently?')) return;

    try {
      await window.api.invoke('developer:revokeLicense');
      alert('License revoked');
      loadData();
    } catch (error) {
      alert('Failed to revoke license');
    }
  };

  const updatePlan = async (plan: string) => {
    const plans = {
      free: { maxUsers: 1, maxProducts: 100, features: ['basic'] },
      basic: { maxUsers: 3, maxProducts: 500, features: ['basic', 'reports'] },
      pro: { maxUsers: 10, maxProducts: 5000, features: ['basic', 'reports', 'api', 'whatsapp'] },
      enterprise: { maxUsers: 999, maxProducts: 999999, features: ['all'] }
    };

    const config = plans[plan as keyof typeof plans];
    if (!config) return;

    try {
      await window.api.invoke('developer:updateLicensePlan', {
        plan,
        maxUsers: config.maxUsers,
        maxProducts: config.maxProducts,
        features: config.features
      });

      alert(`Plan updated to ${plan}`);
      loadData();
    } catch (error) {
      alert('Failed to update plan');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'suspended': return 'text-yellow-500';
      case 'expired': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5" />;
      case 'suspended': return <AlertCircle className="w-5 h-5" />;
      case 'expired': return <XCircle className="w-5 h-5" />;
      default: return <XCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">License Management</h1>
        <button
          onClick={activateLicense}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Activate License
        </button>
      </div>

      {/* Store Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Store Information</h2>
        {store ? (
          <div className="space-y-2">
            <p><strong>Name:</strong> {store.nama}</p>
            <p><strong>Address:</strong> {store.alamat}</p>
            <p><strong>Phone:</strong> {store.telepon}</p>
            <p><strong>Email:</strong> {store.email}</p>
          </div>
        ) : (
          <p className="text-gray-500">No store information</p>
        )}
      </div>

      {/* License Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">License Status</h2>
        {license ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={getStatusColor(license.status)}>
                {getStatusIcon(license.status)}
              </div>
              <div>
                <p className="font-semibold capitalize">{license.status}</p>
                <p className="text-sm text-gray-500">License Key: {license.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-semibold capitalize">{license.plan}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="font-semibold">{new Date(license.expiresAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Max Users</p>
                  <p className="font-semibold">{license.maxUsers}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Max Products</p>
                  <p className="font-semibold">{license.maxProducts}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {license.features.map(f => (
                  <span key={f} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {license.status === 'active' && (
                <button
                  onClick={suspendLicense}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Suspend License
                </button>
              )}
              <button
                onClick={revokeLicense}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Revoke License
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No active license</p>
        )}
      </div>

      {/* Plan Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Change Plan</h2>
        <div className="grid grid-cols-4 gap-4">
          {['free', 'basic', 'pro', 'enterprise'].map(plan => (
            <button
              key={plan}
              onClick={() => updatePlan(plan)}
              className={`p-4 border-2 rounded-lg hover:border-blue-500 ${
                license?.plan === plan ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300'
              }`}
            >
              <p className="font-semibold capitalize">{plan}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
