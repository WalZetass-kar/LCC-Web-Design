import { Capacitor } from '@capacitor/core'
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer'
import { ensureBluetoothPrinterPermission } from './nativePermissions'

export interface BluetoothDevice {
  name: string
  address: string
}

export class PrinterService {
  static async getDevices(): Promise<{ success: boolean; devices?: BluetoothDevice[]; message?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, message: 'Bluetooth hanya tersedia di perangkat mobile native.' }
    }

    const permission = await ensureBluetoothPrinterPermission()
    if (!permission.granted) {
      return { success: false, message: permission.message }
    }

    try {
      // Listen for devices
      return new Promise((resolve) => {
        const devices: BluetoothDevice[] = []
        const listener = CapacitorThermalPrinter.addListener('discoverDevices', (result: any) => {
          if (result.devices) {
            resolve({ 
              success: true, 
              devices: result.devices.map((d: any) => ({ name: d.name || 'Unknown', address: d.address })) 
            })
            listener.remove()
          }
        })
        
        CapacitorThermalPrinter.startScan().catch(err => {
          resolve({ success: false, message: err.message })
          listener.remove()
        })

        // Timeout after 10s
        setTimeout(() => {
          if (devices.length === 0) {
            resolve({ success: false, message: 'Tidak ada printer ditemukan' })
            listener.remove()
          }
        }, 10000)
      })
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Gagal memindai perangkat Bluetooth' }
    }
  }

  static async connect(address: string): Promise<{ success: boolean; message: string }> {
    try {
      await CapacitorThermalPrinter.connect({ address })
      return { success: true, message: 'Printer terhubung' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Gagal terhubung ke printer' }
    }
  }

  static async disconnect(): Promise<void> {
    try {
      await CapacitorThermalPrinter.disconnect()
    } catch (error) {
      console.error('Disconnect error:', error)
    }
  }

  static async printTestReceipt(): Promise<{ success: boolean; message: string }> {
    try {
      await CapacitorThermalPrinter.begin()
        .align('center')
        .text('ZETASS POS\n')
        .text('================================\n')
        .bold()
        .text('TEST PRINT BERHASIL\n')
        .bold(false)
        .text('Printer Thermal Bluetooth Ready\n')
        .text('================================\n')
        .feed(3)
        .print()
      return { success: true, message: 'Test print berhasil' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Gagal mencetak struk' }
    }
  }

  static async printReceipt(options: { 
    storeName: string;
    items: any[];
    total: number;
    footer: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const printer = CapacitorThermalPrinter.begin()
        .align('center')
        .text(`${options.storeName.toUpperCase()}\n`)
        .text('--------------------------------\n')
        .align('left')
      
      for (const item of options.items) {
        const line = `${item.nama_barang.slice(0, 20).padEnd(20)} x${item.qty}\n`
        printer.text(line)
      }
      
      await printer
        .text('--------------------------------\n')
        .align('right')
        .text(`TOTAL: ${options.total}\n`)
        .align('center')
        .text('--------------------------------\n')
        .text(`${options.footer}\n`)
        .feed(3)
        .print()
        
      return { success: true, message: 'Struk dicetak' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Gagal mencetak struk' }
    }
  }
}
