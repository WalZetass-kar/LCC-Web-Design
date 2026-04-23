import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { getElectronAPI } from '../utils/mockAPI';

const TransactionPage = () => {
  const electronAPI = getElectronAPI();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const result = await electronAPI.getAllProducts({ isActive: true, transactionType: 'INCOME' });
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await electronAPI.getAllCategories(true);
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || product.categoryId === parseInt(selectedCategory);
    return matchSearch && matchCategory && product.stock > 0;
  });

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Stok tidak mencukupi');
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    const product = products.find((p) => p.id === productId);
    
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    if (newQuantity > product.stock) {
      alert('Stok tidak mencukupi');
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang masih kosong');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    const total = calculateTotal();
    const payment = parseFloat(paymentAmount);

    if (!payment || payment < total) {
      alert('Jumlah pembayaran kurang');
      return;
    }

    setLoading(true);

    try {
      const transactionData = {
        userId: user.id,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        paymentAmount: payment,
        paymentMethod,
        notes
      };

      const result = await electronAPI.createTransaction(transactionData);

      if (result.success) {
        alert(`Transaksi berhasil!\nNomor Invoice: ${result.data.invoiceNumber}\nKembalian: ${formatCurrency(result.data.changeAmount)}`);
        
        // Reset
        setCart([]);
        setPaymentAmount('');
        setNotes('');
        setShowPaymentModal(false);
        loadProducts(); // Reload to update stock
      } else {
        alert(`Transaksi gagal: ${result.message}`);
      }
    } catch (error) {
      console.error('Transaction error:', error);
      alert('Terjadi kesalahan saat memproses transaksi');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();
  const change = paymentAmount ? parseFloat(paymentAmount) - total : 0;

  return (
    <div className="h-full flex gap-6">
      {/* Products Section */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Transaksi</h1>
          <p className="text-slate-400">Pilih produk untuk ditambahkan ke keranjang</p>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Cari produk (nama/kode)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: '', label: 'Semua Kategori' },
                ...categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name
                }))
              ]}
            />
          </div>
        </Card>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => addToCart(product)}
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {product.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-2">{product.code}</p>
                  <p className="text-lg font-bold text-green-400 mb-1">
                    {formatCurrency(product.price)}
                  </p>
                  {product.discount > 0 && (
                    <p className="text-xs text-slate-500 line-through mb-1">
                      {formatCurrency(product.originalPrice)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Stok: {product.stock} {product.unit}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 flex flex-col gap-4">
        <Card title="Keranjang" subtitle={`${cart.length} item`}>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Keranjang kosong
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="glass p-3 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(item.price)}
                        {item.discount > 0 ? ` • Disc ${item.discount}%` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-white font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-semibold text-green-400">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-300">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              variant="success"
              className="w-full"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              Checkout
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Pembayaran"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>
              Batal
            </Button>
            <Button variant="success" onClick={handlePayment} disabled={loading}>
              {loading ? 'Memproses...' : 'Bayar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center justify-between text-2xl font-bold text-white">
              <span>Total Bayar</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Select
            label="Metode Pembayaran"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'cash', label: 'Tunai' },
              { value: 'card', label: 'Kartu' },
              { value: 'transfer', label: 'Transfer' }
            ]}
          />

          <Input
            label="Jumlah Bayar"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0"
          />

          {paymentAmount && change >= 0 && (
            <div className="glass bg-green-500/20 border-green-500/50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Kembalian</span>
                <span className="text-2xl font-bold text-green-400">
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          <Input
            label="Catatan (Opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tambahkan catatan..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default TransactionPage;
