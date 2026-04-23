import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { getElectronAPI } from '../utils/mockAPI';

const ProductsPage = () => {
  const electronAPI = getElectronAPI();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    code: '',
    name: '',
    description: '',
    originalPrice: '',
    capitalPrice: '',
    discount: '0',
    price: '',
    stock: '',
    unit: 'pcs',
    transactionType: 'INCOME'
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadUnits();
  }, []);

  const loadProducts = async () => {
    const result = await electronAPI.getAllProducts({});
    if (result.success) {
      setProducts(result.data);
    }
  };

  const loadCategories = async () => {
    const result = await electronAPI.getAllCategories(false);
    if (result.success) {
      setCategories(result.data);
    }
  };

  const loadUnits = async () => {
    const result = await electronAPI.getAllUnits();
    if (result.success) {
      setUnits(result.data);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      categoryId: '',
      code: '',
      name: '',
      description: '',
      originalPrice: '',
      capitalPrice: '',
      discount: '0',
      price: '',
      stock: '',
      unit: units[0]?.name || 'pcs',
      transactionType: 'INCOME'
    });
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      categoryId: product.categoryId,
      code: product.code,
      name: product.name,
      description: product.description || '',
      originalPrice: product.originalPrice || product.price || '',
      capitalPrice: product.capitalPrice || '',
      discount: product.discount ?? '0',
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      transactionType: product.transactionType || 'INCOME'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
    
    const result = await electronAPI.deleteProduct(id);
    if (result.success) {
      alert('Produk berhasil dihapus');
      loadProducts();
    } else {
      alert(result.message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.categoryId || !formData.code || !formData.name || !formData.originalPrice || !formData.stock) {
      alert('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const originalPrice = parseFloat(formData.originalPrice);
    const discount = parseFloat(formData.discount || 0);
    const effectivePrice = originalPrice - (originalPrice * discount / 100);

    const data = {
      ...formData,
      categoryId: parseInt(formData.categoryId),
      originalPrice,
      capitalPrice: parseFloat(formData.capitalPrice || 0),
      discount,
      price: effectivePrice,
      stock: parseInt(formData.stock)
    };

    let result;
    if (editingProduct) {
      result = await electronAPI.updateProduct(editingProduct.id, data);
    } else {
      result = await electronAPI.createProduct(data);
    }

    if (result.success) {
      alert(result.message);
      setShowModal(false);
      loadProducts();
    } else {
      alert(result.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const columns = [
    {
      accessorKey: 'code',
      header: 'Kode',
      cell: (info) => <span className="font-mono">{info.getValue()}</span>
    },
    {
      accessorKey: 'name',
      header: 'Nama Produk'
    },
    {
      accessorKey: 'categoryName',
      header: 'Kategori'
    },
    {
      accessorKey: 'price',
      header: 'Harga Jual',
      cell: (info) => {
        const product = info.row.original;

        return (
          <div className="flex flex-col">
            <span>{formatCurrency(info.getValue())}</span>
            {product.discount > 0 && (
              <span className="text-xs text-slate-400 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'discount',
      header: 'Disc',
      cell: (info) => `${info.getValue() || 0}%`
    },
    {
      accessorKey: 'stock',
      header: 'Stok',
      cell: (info) => (
        <span className={info.getValue() < 10 ? 'text-red-400 font-semibold' : ''}>
          {info.getValue()} {info.row.original.unit}
        </span>
      )
    },
    {
      accessorKey: 'transactionType',
      header: 'Jenis',
      cell: (info) => (
        <span className={`px-2 py-1 rounded text-xs ${info.getValue() === 'INCOME' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {info.getValue() === 'INCOME' ? 'Penjualan' : 'Pengeluaran'}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: (info) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(info.row.original)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(info.row.original.id)}>
            Hapus
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Manajemen Produk</h1>
          <p className="text-slate-400">Kelola data produk</p>
        </div>
        <Button variant="primary" onClick={handleAdd}>
          + Tambah Produk
        </Button>
      </div>

      <Card>
        <Table data={products} columns={columns} />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Kategori *"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            options={[
              { value: '', label: 'Pilih Kategori' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name }))
            ]}
          />
          <Input
            label="Kode Produk *"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="MKN001"
            disabled={Boolean(editingProduct)}
          />
          <Input
            label="Nama Produk *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nama produk"
          />
          <Input
            label="Deskripsi"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Deskripsi produk"
          />
          <Input
            label="Harga Jual Dasar *"
            type="number"
            value={formData.originalPrice}
            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Harga Modal"
            type="number"
            value={formData.capitalPrice}
            onChange={(e) => setFormData({ ...formData, capitalPrice: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Diskon (%)"
            type="number"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Stok *"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            placeholder="0"
          />
          <Select
            label="Satuan *"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            options={[
              ...units.map((unit) => ({ value: unit.name, label: unit.name }))
            ]}
          />
          <Select
            label="Jenis Transaksi *"
            value={formData.transactionType}
            onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
            options={[
              { value: 'INCOME', label: 'Penjualan' },
              { value: 'OUTCOME', label: 'Pengeluaran' }
            ]}
          />
          {formData.originalPrice && (
            <div className="glass p-3 rounded-lg text-sm text-slate-300">
              Harga efektif: {formatCurrency(parseFloat(formData.originalPrice || 0) - ((parseFloat(formData.originalPrice || 0) * parseFloat(formData.discount || 0)) / 100))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
