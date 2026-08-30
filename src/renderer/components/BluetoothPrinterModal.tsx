import React, { useState, useEffect } from 'react'
import { Bluetooth, Printer, CheckCircle2, AlertCircle, RefreshCw, Unlink, FileText } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { bluetoothPrinter } from '../utils/bluetoothPrinter'
import { useToast } from '../contexts/ToastContext'

interface BluetoothPrinterModalProps {
  open: boolean
  onClose: () => void
}

export default function BluetoothPrinterModal({ open, onClose }: BluetoothPrinterModalProps) {
  const toast = useToast()
  const [connecting, setConnecting] = useState(false)
  const [testPrinting, setTestPrinting] = useState(false)
  const [connectedName, setConnectedName] = useState<string | null>(null)
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm')

  useEffect(() => {
    if (open) {
      setConnectedName(bluetoothPrinter.getConnectedPrinterName())
      try {
        const savedSize = localStorage.getItem('zetass_bt_paper_size') as '58mm' | '80mm'
        if (savedSize) setPaperSize(savedSize)
      } catch {}
    }
  }, [open])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await bluetoothPrinter.connect()
      if (res.success) {
        setConnectedName(res.deviceName || 'Thermal Printer')
        toast(res.message, 'success')
      } else {
        toast(res.message, 'error')
      }
    } catch (err: any) {
      toast(err.message || 'Gagal menyambungkan printer.', 'error')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    bluetoothPrinter.disconnect()
    setConnectedName(null)
    toast('Printer Bluetooth terputus.', 'info')
  }

  const handleTestPrint = async () => {
    setTestPrinting(true)
    try {
      const res = await bluetoothPrinter.testPrint()
      if (res.success) {
        toast(res.message, 'success')
      } else {
        toast(res.message, 'error')
      }
    } catch (err: any) {
      toast(err.message || 'Gagal mengirim test print.', 'error')
    } finally {
      setTestPrinting(false)
    }
  }

  const handleSavePaperSize = (size: '58mm' | '80mm') => {
    setPaperSize(size)
    try {
      localStorage.setItem('zetass_bt_paper_size', size)
    } catch {}
    toast(`Ukuran kertas diatur ke ${size}`, 'success')
  }

  return (
    <Modal open={open} onClose={onClose} title="Pengaturan Printer Bluetooth" size="md">
      <div className="space-y-5">
        {/* Connection Status Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            connectedName
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  connectedName
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Bluetooth size={22} className={connecting ? 'animate-pulse' : ''} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status Printer</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                  {connectedName ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span className="truncate max-w-[200px]">{connectedName}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                      <span>Belum Terhubung</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {connectedName ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDisconnect}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50"
              >
                <Unlink size={15} className="mr-1.5" />
                Putus
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                disabled={connecting}
                className="font-bold shadow-md shadow-red-600/20"
              >
                {connecting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin mr-1.5" />
                    Mencari...
                  </>
                ) : (
                  <>
                    <Bluetooth size={15} className="mr-1.5" />
                    Hubungkan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Paper Size Setting */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Ukuran Kertas Thermal
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSavePaperSize('58mm')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                paperSize === '58mm'
                  ? 'border-red-600 bg-red-50/70 dark:bg-red-950/40 dark:border-red-500 text-red-700 dark:text-red-400 font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div>
                <p className="text-sm font-bold">58 mm (Mini)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">32 karakter / baris</p>
              </div>
              <Printer size={18} className="opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => handleSavePaperSize('80mm')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                paperSize === '80mm'
                  ? 'border-red-600 bg-red-50/70 dark:bg-red-950/40 dark:border-red-500 text-red-700 dark:text-red-400 font-bold shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div>
                <p className="text-sm font-bold">80 mm (Standar)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">48 karakter / baris</p>
              </div>
              <Printer size={18} className="opacity-70" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={handleTestPrint}
            disabled={!connectedName || testPrinting}
            className="flex-1 font-semibold"
          >
            {testPrinting ? (
              <>
                <RefreshCw size={16} className="animate-spin mr-2" />
                Mencetak...
              </>
            ) : (
              <>
                <FileText size={16} className="mr-2" />
                Test Print Nota
              </>
            )}
          </Button>

          <Button variant="primary" onClick={onClose} className="px-6 font-bold">
            Selesai
          </Button>
        </div>
      </div>
    </Modal>
  )
}
