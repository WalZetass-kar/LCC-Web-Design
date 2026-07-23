import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Search, Plus, QrCode, Printer, Trash2, UserCircle } from 'lucide-react'
import QRCode from 'qrcode'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Badge from '../components/Badge'
import { MemberGridSkeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { formatRupiah } from '../utils/format'
import { useToast } from '../contexts/ToastContext'

interface Member {
  kd_customer: string
  nama_customer: string
  no_telp: string | null
  poin: number
  total_belanja: number
  status: string
  member_card_id: string | null
  created_at: string
}

export default function MembershipCard() {
  const toast = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await api<Member[]>('membership:getAll', search)
    if (r.success) setMembers(r.data ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const generateCard = async (member: Member) => {
    setSelectedMember(member)
    const cardId = member.member_card_id ?? `MBR-${member.kd_customer}`
    const payload = JSON.stringify({ type: 'member', id: member.kd_customer, card: cardId })
    try {
      const img = await QRCode.toDataURL(payload, { width: 200, margin: 1 })
      setQrImage(img)
      setShowQR(true)
    } catch {
      toast('Gagal generate QR', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <CreditCard size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Membership Card</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cetak & kelola kartu member digital untuk customer</p>
        </div>
      </div>

      <Card>
        <Input placeholder="Cari member..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
      </Card>

      {loading ? (
        <MemberGridSkeleton count={6} />
      ) : members.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-slate-400">
            <CreditCard size={36} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada member terdaftar</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map(m => (
            <Card key={m.kd_customer}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {m.nama_customer.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{m.nama_customer}</p>
                  <p className="text-xs text-slate-400">{m.no_telp ?? '-'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge label={m.status} variant={m.status === 'Aktif' ? 'green' : 'red'} />
                    <span className="text-xs text-amber-500 font-semibold">{m.poin} poin</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Belanja: {formatRupiah(m.total_belanja)}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <Button size="sm" variant="secondary" icon={<QrCode size={12} />} onClick={() => generateCard(m)} className="flex-1">
                  Kartu QR
                </Button>
                <Button size="sm" variant="secondary" icon={<Printer size={12} />} onClick={() => generateCard(m)} className="flex-1">
                  Cetak
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showQR} onClose={() => setShowQR(false)} title="Kartu Member" size="sm">
        {selectedMember && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-full max-w-xs rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {selectedMember.nama_customer.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm">{selectedMember.nama_customer}</p>
                  <p className="text-xs text-white/70">{selectedMember.member_card_id ?? `MBR-${selectedMember.kd_customer}`}</p>
                </div>
              </div>
              {qrImage && (
                <div className="bg-white rounded-xl p-3 flex justify-center">
                  <img src={qrImage} alt="QR Member" className="w-40 h-40" />
                </div>
              )}
              <div className="flex justify-between mt-4 text-xs text-white/80">
                <span>Poin: {selectedMember.poin}</span>
                <span>{selectedMember.status}</span>
              </div>
            </div>
            <Button icon={<Printer size={14} />} onClick={() => window.print()}>Cetak Kartu</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
