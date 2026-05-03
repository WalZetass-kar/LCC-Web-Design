import { useState } from 'react'
import { Upload, Download, FileSpreadsheet } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'
import { useToast } from '../contexts/ToastContext'

interface BulkImportProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: any[]) => Promise<void>
}

export default function BulkImport({ isOpen, onClose, onImport }: BulkImportProps) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file) return toast.error('Pilih file terlebih dahulu')
    
    setLoading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj: any = {}
        headers.forEach((h, i) => {
          obj[h] = values[i]
        })
        return obj
      })
      
      await onImport(data)
      toast.success(`Berhasil import ${data.length} data`)
      onClose()
    } catch (error) {
      toast.error('Gagal import data')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'kd_barang,nama_barang,kategori_id,satuan_id,harga_jual,harga_modal,stok,barcode\nBRG001,Contoh Produk,1,1,10000,8000,100,1234567890123'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_produk.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Produk">
      <div className="space-y-4">
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button as="span" icon={Upload}>Pilih File CSV/Excel</Button>
          </label>
          {file && <p className="mt-2 text-sm text-gray-600">{file.name}</p>}
        </div>

        <Button variant="secondary" onClick={downloadTemplate} icon={Download} className="w-full">
          Download Template
        </Button>

        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={!file || loading} className="flex-1">
            Import
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  )
}
