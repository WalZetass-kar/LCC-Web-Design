import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { getElectronAPI } from '../utils/mockAPI';

const HistoryPage = () => {
  const electronAPI = getElectronAPI();
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const result = await electronAPI.getAllTransactions({});
    if (result.success) {
      setTransactions(result.data);
    }
  };

  const handleViewDetail = async (transaction) => {
    const result = await electronAPI.getTransactionById(transaction.id);
    if (result.success) {
      setSelectedTransaction(result.data);
      setShowDetailModal(true);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      accessorKey: 'invoiceNumber',
      header: 'No. Invoice',
      cell: (info) => <span className="font-mono font-semibold">{info.getValue()}</span>
    },
    {
      accessorKey: 'transactionDate',
      header: 'Tanggal',
      cell: (info) => formatDate(info.getValue())
    },
    {
      accessorKey: 'userName',
      header: 'Kasir'
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: (info) => <span className="font-semibold text-green-400">{formatCurrency(info.getValue())}</span>
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Metode',
      cell: (info) => {
        const method = info.getValue();
        const labels = { cash: 'Tunai', card: 'Kartu', transfer: 'Transfer' };
        return <span className="capitalize">{labels[method] || method}</span>;
      }
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: (info) => (
        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(info.row.original)}>
          Detail
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Riwayat Transaksi</h1>
        <p className="text-slate-400">Daftar semua transaksi yang telah dilakukan</p>
      </div>

      <Card>
        <Table data={transactions} columns={columns} />
      </Card>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detail Transaksi"
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            {/* Transaction Info */}
            <div className="glass p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">No. Invoice</span>
                <span className="font-mono font-semibold text-white">{selectedTransaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal</span>
                <span className="text-white">{formatDate(selectedTransaction.transactionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Metode Pembayaran</span>
                <span className="text-white capitalize">{selectedTransaction.paymentMethod}</span>
              </div>
              {selectedTransaction.notes && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Catatan</span>
                  <span className="text-white">{selectedTransaction.notes}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Item Produk</h3>
              <div className="space-y-2">
                {selectedTransaction.items?.map((item, index) => (
                  <div key={index} className="glass p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white">{item.productName}</p>
                      <p className="text-sm text-slate-400">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-green-400">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="glass p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedTransaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Jumlah Bayar</span>
                <span>{formatCurrency(selectedTransaction.paymentAmount)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Kembalian</span>
                  <span className="text-green-400">{formatCurrency(selectedTransaction.changeAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
