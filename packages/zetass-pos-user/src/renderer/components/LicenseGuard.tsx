import { useEffect, useState } from 'react';
import { AlertCircle, Shield, XCircle } from 'lucide-react';

interface LicenseStatus {
  valid: boolean;
  message: string;
  info?: {
    plan: string;
    expiresAt: Date;
    maxUsers: number;
    maxProducts: number;
  };
}

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLicense();
    // Check every 5 minutes
    const interval = setInterval(checkLicense, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkLicense = async () => {
    try {
      const status = await window.api.invoke('user:checkLicense');
      setLicense(status);
    } catch (error) {
      console.error('License check failed:', error);
      setLicense({
        valid: false,
        message: 'Failed to check license'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Checking license...</p>
        </div>
      </div>
    );
  }

  if (!license?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-2">License Invalid</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {license?.message || 'Your license is not valid'}
            </p>

            {license?.info && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Plan:</strong> {license.info.plan}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Expired:</strong> {new Date(license.info.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-left">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">Contact Administrator</p>
                <p>Please contact your system administrator or developer to activate your license.</p>
              </div>
            </div>

            <button
              onClick={checkLicense}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
