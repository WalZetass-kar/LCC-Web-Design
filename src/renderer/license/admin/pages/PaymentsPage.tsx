import React, { useCallback, useEffect, useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import {
  AdminPlanRow, AdminUserRow, PaymentRow,
  approvePayment, createPayment, listPayments, listPlans, listUsers,
} from '../api';
import { Alert, Badge, Button, Field, Input, Modal, PageHeader, Select, Table, Td, Th } from '../components';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPayments(await listPayments()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Pembayaran"
        subtitle="Catat pembayaran manual. Status success otomatis perpanjang langganan user."
        action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Catat Pembayaran</Button>}
      />
      <Table>
        <thead>
          <tr><Th>User</Th><Th>Paket</Th><Th>Jumlah</Th><Th>Metode</Th><Th>Status</Th><Th>Tanggal</Th><Th></Th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Memuat…</td></tr>
          ) : payments.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Belum ada pembayaran</td></tr>
          ) : payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <Td>
                <p className="font-medium text-slate-800 dark:text-white">{p.user_name}</p>
                <p className="text-xs text-slate-400">{p.user_email}</p>
              </Td>
              <Td><Badge color="indigo">{p.plan_code || '—'}</Badge></Td>
              <Td><span className="font-medium">Rp {Number(p.amount).toLocaleString('id-ID')}</span></Td>
              <Td><span className="text-slate-500 text-xs">{p.method}</span></Td>
              <Td>
                <Badge color={p.status === 'success' ? 'green' : p.status === 'pending' ? 'yellow' : 'red'}>
                  {p.status}
                </Badge>
              </Td>
              <Td><span className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString('id-ID')}</span></Td>
              <Td>
                {p.status === 'pending' && (
                  <Button size="sm" onClick={async () => { await approvePayment(p.id); load(); }}>
                    <CheckCircle className="w-3 h-3" />Approve
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {showAdd && <AddPaymentModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
};

const AddPaymentModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [form, setForm] = useState({ user_id: '', plan_code: 'BASIC', amount: 99000, method: 'manual_transfer', status: 'success' as 'success' | 'pending', notes: '' });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listUsers().then(setUsers);
    listPlans().then(setPlans);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.user_id) return setErr('User wajib dipilih');
    setErr(null); setLoading(true);
    try {
      await createPayment({ user_id: Number(form.user_id), plan_code: form.plan_code, amount: Number(form.amount), method: form.method, status: form.status, notes: form.notes });
      onSaved(); onClose();
    } catch (e: any) { setErr(e?.response?.data?.message || e?.message || 'Gagal'); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Catat Pembayaran" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {err && <Alert>{err}</Alert>}
        <Field label="User">
          <Select required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
            <option value="">— pilih user —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paket">
            <Select value={form.plan_code} onChange={(e) => {
              const plan = plans.find((p) => p.code === e.target.value);
              setForm({ ...form, plan_code: e.target.value, amount: plan ? Number(plan.price) : form.amount });
            }}>
              {plans.map((p) => <option key={p.code} value={p.code}>{p.name} — Rp {Number(p.price).toLocaleString('id-ID')}</option>)}
            </Select>
          </Field>
          <Field label="Jumlah (Rp)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label="Metode"><Input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'success' | 'pending' })}>
              <option value="success">success (auto perpanjang)</option>
              <option value="pending">pending (butuh approve)</option>
            </Select>
          </Field>
        </div>
        <Field label="Catatan"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  );
};
