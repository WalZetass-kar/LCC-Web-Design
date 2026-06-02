import { useState, useEffect } from 'react';
import { Users, Shield, Ban, CheckCircle, XCircle } from 'lucide-react';

interface UserAccount {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await window.api.invoke('developer:getAllUsers');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: number, status: string) => {
    try {
      await window.api.invoke('developer:updateUserStatus', { userId, status });
      alert(`User ${status} successfully`);
      loadUsers();
    } catch (error) {
      alert('Failed to update user status');
    }
  };

  const suspendUser = (userId: number) => {
    if (!confirm('Suspend this user? They will not be able to login.')) return;
    updateUserStatus(userId, 'suspended');
  };

  const activateUser = (userId: number) => {
    updateUserStatus(userId, 'active');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      developer: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      super_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      kasir: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      operator: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return colors[role as keyof typeof colors] || colors.operator;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7" />
          User Management
        </h1>
        <div className="text-sm text-gray-500">
          Total Users: {users.length}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 text-sm">{user.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{user.email || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {user.status === 'active' ? (
                      <button
                        onClick={() => suspendUser(user.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                        title="Suspend User"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => activateUser(user.id)}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                        title="Activate User"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No users found</p>
        </div>
      )}
    </div>
  );
}
