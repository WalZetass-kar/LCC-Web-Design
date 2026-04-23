import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { getElectronAPI } from '../utils/mockAPI';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import { useTheme } from '../context/ThemeContext';

const DashboardPage = () => {
  const electronAPI = getElectronAPI();
  const { currentTheme } = useTheme();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startOfMonth.setHours(0, 0, 0, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const result = await electronAPI.getDashboardStats(
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Memuat data...</p>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-slate-400">Ringkasan penjualan bulan ini</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          hover
          className={`bg-gradient-to-br from-blue-600/20 to-blue-800/20 ${currentTheme.border} border-2 relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                Total Penjualan
              </p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(stats.totalSales)}
              </p>
            </div>
            <div className="p-4 bg-blue-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card 
          hover
          className={`bg-gradient-to-br from-green-600/20 to-green-800/20 ${currentTheme.border} border-2 relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Total Transaksi
              </p>
              <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
            </div>
            <div className="p-4 bg-green-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card 
          hover
          className={`bg-gradient-to-br from-purple-600/20 to-purple-800/20 ${currentTheme.border} border-2 relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                Rata-rata Transaksi
              </p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(stats.totalTransactions > 0 ? stats.totalSales / stats.totalTransactions : 0)}
              </p>
            </div>
            <div className="p-4 bg-purple-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <Card 
        title="Produk Terlaris" 
        subtitle="5 produk dengan penjualan tertinggi"
        className="relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        {stats.topProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-slate-700/30 rounded-full mb-4">
              <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-400">Belum ada data penjualan</p>
          </div>
        ) : (
          <div className="space-y-3 relative">
            {stats.topProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 glass rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] group"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-full 
                    bg-gradient-to-br ${currentTheme.accent}
                    flex items-center justify-center 
                    text-white font-bold text-lg
                    shadow-lg ${currentTheme.glow}
                    group-hover:scale-110 transition-transform
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                      {product.productName}
                    </p>
                    <p className="text-sm text-slate-400">
                      Terjual: <span className="font-semibold text-slate-300">{product.totalQuantity}</span> unit
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-400 text-lg">
                    {formatCurrency(product.totalRevenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
