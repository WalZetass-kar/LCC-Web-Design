import { EmployeeModel } from '../models/EmployeeModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class EmployeeController {
  // ─── EMPLOYEE CRUD ───────────────────────────────────────────────

  static getAll() {
    try {
      const data = EmployeeModel.getAll()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data karyawan: ' + (error as Error).message }
    }
  }

  static getById(id: number) {
    try {
      const data = EmployeeModel.getById(id)
      if (!data) {
        return { success: false, message: 'Karyawan tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data karyawan: ' + (error as Error).message }
    }
  }

  static async create(data: Parameters<typeof EmployeeModel.create>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.nik?.trim()) {
        return { success: false, message: 'NIK wajib diisi' }
      }
      if (!data.nama_lengkap?.trim()) {
        return { success: false, message: 'Nama lengkap wajib diisi' }
      }
      if (!data.tgl_masuk?.trim()) {
        return { success: false, message: 'Tanggal masuk wajib diisi' }
      }

      EmployeeModel.create(data)
      return { success: true, message: 'Karyawan berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan karyawan: ' + (error as Error).message }
    }
  }

  static async update(id: number, data: Parameters<typeof EmployeeModel.update>[1]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const existing = EmployeeModel.getById(id)
      if (!existing) {
        return { success: false, message: 'Karyawan tidak ditemukan' }
      }

      EmployeeModel.update(id, data)
      return { success: true, message: 'Data karyawan berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui karyawan: ' + (error as Error).message }
    }
  }

  static async delete(id: number) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const existing = EmployeeModel.getById(id)
      if (!existing) {
        return { success: false, message: 'Karyawan tidak ditemukan' }
      }

      EmployeeModel.delete(id)
      return { success: true, message: 'Karyawan berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus karyawan: ' + (error as Error).message }
    }
  }

  static search(query: string) {
    try {
      if (!query?.trim()) {
        return { success: false, message: 'Kata kunci pencarian wajib diisi' }
      }

      const data = EmployeeModel.search(query)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mencari karyawan: ' + (error as Error).message }
    }
  }

  static getByStatus(status: string) {
    try {
      if (!status?.trim()) {
        return { success: false, message: 'Status wajib diisi' }
      }

      const data = EmployeeModel.getByStatus(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data karyawan: ' + (error as Error).message }
    }
  }

  // ─── CONTRACTS ───────────────────────────────────────────────────

  static getContracts(employeeId: number) {
    try {
      const data = EmployeeModel.getContracts(employeeId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil kontrak: ' + (error as Error).message }
    }
  }

  static getContractById(id: number) {
    try {
      const data = EmployeeModel.getContractById(id)
      if (!data) {
        return { success: false, message: 'Kontrak tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil kontrak: ' + (error as Error).message }
    }
  }

  static async createContract(data: Parameters<typeof EmployeeModel.createContract>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.employee_id) {
        return { success: false, message: 'Karyawan wajib dipilih' }
      }
      if (!data.nomor_kontrak?.trim()) {
        return { success: false, message: 'Nomor kontrak wajib diisi' }
      }
      if (!data.jenis_kontrak?.trim()) {
        return { success: false, message: 'Jenis kontrak wajib diisi' }
      }
      if (!data.tgl_mulai?.trim()) {
        return { success: false, message: 'Tanggal mulai wajib diisi' }
      }
      if (!data.jabatan?.trim()) {
        return { success: false, message: 'Jabatan wajib diisi' }
      }

      EmployeeModel.createContract(data)
      return { success: true, message: 'Kontrak berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan kontrak: ' + (error as Error).message }
    }
  }

  static async updateContract(id: number, data: Parameters<typeof EmployeeModel.updateContract>[1]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const existing = EmployeeModel.getContractById(id)
      if (!existing) {
        return { success: false, message: 'Kontrak tidak ditemukan' }
      }

      EmployeeModel.updateContract(id, data)
      return { success: true, message: 'Kontrak berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui kontrak: ' + (error as Error).message }
    }
  }

  static async terminateContract(id: number, data: Parameters<typeof EmployeeModel.terminateContract>[1]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const existing = EmployeeModel.getContractById(id)
      if (!existing) {
        return { success: false, message: 'Kontrak tidak ditemukan' }
      }

      if (!data.tgl_berakhir?.trim()) {
        return { success: false, message: 'Tanggal berakhir wajib diisi' }
      }

      EmployeeModel.terminateContract(id, data)
      return { success: true, message: 'Kontrak berhasil diakhiri' }
    } catch (error) {
      return { success: false, message: 'Gagal mengakhiri kontrak: ' + (error as Error).message }
    }
  }

  // ─── ATTENDANCE ──────────────────────────────────────────────────

  static getAttendance(date: string) {
    try {
      if (!date?.trim()) {
        return { success: false, message: 'Tanggal wajib diisi' }
      }

      const data = EmployeeModel.getAttendance(date)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil absensi: ' + (error as Error).message }
    }
  }

  static getAttendanceByEmployee(id: number, startDate: string, endDate: string) {
    try {
      if (!startDate?.trim() || !endDate?.trim()) {
        return { success: false, message: 'Rentang tanggal wajib diisi' }
      }

      const data = EmployeeModel.getAttendanceByEmployee(id, startDate, endDate)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil absensi: ' + (error as Error).message }
    }
  }

  static async clockIn(data: Parameters<typeof EmployeeModel.clockIn>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.employee_id) {
        return { success: false, message: 'Karyawan wajib dipilih' }
      }
      if (!data.tgl?.trim()) {
        return { success: false, message: 'Tanggal wajib diisi' }
      }
      if (!data.jam_masuk?.trim()) {
        return { success: false, message: 'Jam masuk wajib diisi' }
      }

      EmployeeModel.clockIn(data)
      return { success: true, message: 'Absensi masuk berhasil dicatat' }
    } catch (error) {
      return { success: false, message: 'Gagal absensi masuk: ' + (error as Error).message }
    }
  }

  static async clockOut(id: number, data: Parameters<typeof EmployeeModel.clockOut>[1]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.jam_keluar?.trim()) {
        return { success: false, message: 'Jam keluar wajib diisi' }
      }

      EmployeeModel.clockOut(id, data)
      return { success: true, message: 'Absensi keluar berhasil dicatat' }
    } catch (error) {
      return { success: false, message: 'Gagal absensi keluar: ' + (error as Error).message }
    }
  }

  static getAttendanceSummary(employeeId: number, month: number, year: number) {
    try {
      if (!month || !year) {
        return { success: false, message: 'Bulan dan tahun wajib diisi' }
      }

      const data = EmployeeModel.getAttendanceSummary(employeeId, month, year)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil ringkasan absensi: ' + (error as Error).message }
    }
  }

  // ─── PAYROLL ─────────────────────────────────────────────────────

  static getPayroll(month: number, year: number) {
    try {
      if (!month || !year) {
        return { success: false, message: 'Bulan dan tahun wajib diisi' }
      }

      const data = EmployeeModel.getPayroll(month, year)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil payroll: ' + (error as Error).message }
    }
  }

  static getPayrollByEmployee(id: number, month: number, year: number) {
    try {
      if (!month || !year) {
        return { success: false, message: 'Bulan dan tahun wajib diisi' }
      }

      const data = EmployeeModel.getPayrollByEmployee(id, month, year)
      if (!data) {
        return { success: false, message: 'Payroll tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil payroll: ' + (error as Error).message }
    }
  }

  static async createPayroll(data: Parameters<typeof EmployeeModel.createPayroll>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.employee_id) {
        return { success: false, message: 'Karyawan wajib dipilih' }
      }
      if (!data.periode_bulan || !data.periode_tahun) {
        return { success: false, message: 'Periode bulan dan tahun wajib diisi' }
      }

      EmployeeModel.createPayroll(data)
      return { success: true, message: 'Payroll berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat payroll: ' + (error as Error).message }
    }
  }

  static async updatePayrollStatus(id: number, status: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const validStatuses = ['DRAFT', 'DISETUJUI', 'DIBAYAR']
      if (!validStatuses.includes(status)) {
        return { success: false, message: 'Status tidak valid. Gunakan: DRAFT, DISETUJUI, atau DIBAYAR' }
      }

      EmployeeModel.updatePayrollStatus(id, status)
      return { success: true, message: 'Status payroll berhasil diperbarui' }
    } catch (error) {
      return { success: false, message: 'Gagal memperbarui status payroll: ' + (error as Error).message }
    }
  }

  static generatePayrollSlip(id: number) {
    try {
      const data = EmployeeModel.generatePayrollSlip(id)
      if (!data) {
        return { success: false, message: 'Payroll tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal generate slip gaji: ' + (error as Error).message }
    }
  }

  static getPayrollSummary(month: number, year: number) {
    try {
      if (!month || !year) {
        return { success: false, message: 'Bulan dan tahun wajib diisi' }
      }

      const data = EmployeeModel.getPayrollSummary(month, year)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil ringkasan payroll: ' + (error as Error).message }
    }
  }

  // ─── PAYROLL DETAILS ─────────────────────────────────────────────

  static getDetails(payrollId: number) {
    try {
      const data = EmployeeModel.getDetails(payrollId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil detail payroll: ' + (error as Error).message }
    }
  }

  static async addDetail(data: Parameters<typeof EmployeeModel.addDetail>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.payroll_id) {
        return { success: false, message: 'Payroll wajib dipilih' }
      }
      if (!data.komponen?.trim()) {
        return { success: false, message: 'Komponen wajib diisi' }
      }
      if (!data.tipe?.trim()) {
        return { success: false, message: 'Tipe wajib diisi' }
      }

      EmployeeModel.addDetail(data)
      return { success: true, message: 'Detail payroll berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan detail payroll: ' + (error as Error).message }
    }
  }

  static async deleteDetail(id: number) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      EmployeeModel.deleteDetail(id)
      return { success: true, message: 'Detail payroll berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus detail payroll: ' + (error as Error).message }
    }
  }

  // ─── TIP POOLING ─────────────────────────────────────────────────

  static getTipPoolings() {
    try {
      const data = EmployeeModel.getTipPoolings()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil tip pooling: ' + (error as Error).message }
    }
  }

  static async createTipPooling(data: Parameters<typeof EmployeeModel.createTipPooling>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.tgl?.trim()) {
        return { success: false, message: 'Tanggal wajib diisi' }
      }

      EmployeeModel.createTipPooling(data)
      return { success: true, message: 'Tip pooling berhasil dibuat' }
    } catch (error) {
      return { success: false, message: 'Gagal membuat tip pooling: ' + (error as Error).message }
    }
  }

  static async distributeTip(id: number, distributions: Parameters<typeof EmployeeModel.distributeTip>[1]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!distributions || distributions.length === 0) {
        return { success: false, message: 'Distribusi tip wajib diisi minimal 1 karyawan' }
      }

      const result = EmployeeModel.distributeTip(id, distributions)
      if (!result) {
        return { success: false, message: 'Tip pooling tidak ditemukan' }
      }

      return { success: true, message: 'Tip berhasil didistribusikan', data: result }
    } catch (error) {
      return { success: false, message: 'Gagal mendistribusikan tip: ' + (error as Error).message }
    }
  }

  static getTipDistributions(poolingId: number) {
    try {
      const data = EmployeeModel.getTipDistributions(poolingId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil distribusi tip: ' + (error as Error).message }
    }
  }

  // ─── SHIFT SCHEDULE ──────────────────────────────────────────────

  static getSchedules(date: string) {
    try {
      if (!date?.trim()) {
        return { success: false, message: 'Tanggal wajib diisi' }
      }

      const data = EmployeeModel.getSchedules(date)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil jadwal shift: ' + (error as Error).message }
    }
  }

  static getSchedulesByEmployee(id: number, startDate: string, endDate: string) {
    try {
      if (!startDate?.trim() || !endDate?.trim()) {
        return { success: false, message: 'Rentang tanggal wajib diisi' }
      }

      const data = EmployeeModel.getSchedulesByEmployee(id, startDate, endDate)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil jadwal shift: ' + (error as Error).message }
    }
  }

  static async createSchedule(data: Parameters<typeof EmployeeModel.createSchedule>[0]) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      if (!data.employee_id) {
        return { success: false, message: 'Karyawan wajib dipilih' }
      }
      if (!data.tgl?.trim()) {
        return { success: false, message: 'Tanggal wajib diisi' }
      }
      if (!data.shift?.trim()) {
        return { success: false, message: 'Shift wajib diisi' }
      }
      if (!data.jam_masuk?.trim() || !data.jam_keluar?.trim()) {
        return { success: false, message: 'Jam masuk dan jam keluar wajib diisi' }
      }

      EmployeeModel.createSchedule(data)
      return { success: true, message: 'Jadwal shift berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan jadwal shift: ' + (error as Error).message }
    }
  }

  static async deleteSchedule(id: number) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      EmployeeModel.deleteSchedule(id)
      return { success: true, message: 'Jadwal shift berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus jadwal shift: ' + (error as Error).message }
    }
  }
}
