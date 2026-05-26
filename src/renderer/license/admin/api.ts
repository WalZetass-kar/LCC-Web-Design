/**
 * Helper API admin yang reuse axios instance dari LicenseClient.
 * Hanya bisa dipanggil oleh user role super_admin / admin.
 */
import { getLicenseClient } from '../apiClient';

function http() {
  return getLicenseClient().request();
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  plan_code: string | null;
  sub_status: string | null;
  expired_at: string | null;
  active_devices: number;
  created_at: string;
}

export interface AdminPlanRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  is_active: number;
  sort_order: number;
}

export interface AdminFeatureRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  sort_order: number;
  is_active: number;
}

export interface PlanFeatureRow {
  id: number;
  code: string;
  name: string;
  category: string | null;
  sort_order: number;
  is_enabled: number;
  limit_value: number | null;
}

export interface PopupRow {
  id: number;
  code: string;
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  whatsapp_number: string | null;
  image_url: string | null;
  pricing_html: string | null;
  is_active: number;
}

export interface PaymentRow {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  plan_code: string | null;
  amount: number;
  currency: string | null;
  method: string | null;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

// ===== Users =====
export async function listUsers(search?: string): Promise<AdminUserRow[]> {
  const r = await http().get('/admin/users', { params: search ? { search } : {} });
  return r.data.data;
}

export async function getUser(id: number) {
  const r = await http().get(`/admin/users/${id}`);
  return r.data.data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  plan_code: string;
  duration_days?: number;
  notes?: string;
}) {
  const r = await http().post('/admin/users', payload);
  return r.data.data;
}

export async function updateUser(id: number, payload: { name?: string; phone?: string; status?: string }) {
  await http().patch(`/admin/users/${id}`, payload);
}

export async function resetUserPassword(id: number, newPassword?: string) {
  const r = await http().post(`/admin/users/${id}/reset-password`, { new_password: newPassword });
  return r.data.data as { new_password: string };
}

export async function deleteUser(id: number) {
  await http().delete(`/admin/users/${id}`);
}

export async function changeUserPlan(id: number, payload: { plan_code: string; duration_days?: number; notes?: string }) {
  const r = await http().put(`/admin/users/${id}/plan`, payload);
  return r.data.data as { expired_at: string };
}

export async function setUserFeatureOverride(
  id: number,
  code: string,
  payload: { enabled: boolean; limit?: number | null },
) {
  await http().put(`/admin/users/${id}/features/${code}`, payload);
}

export async function clearUserFeatureOverride(id: number, code: string) {
  await http().delete(`/admin/users/${id}/features/${code}`);
}

// ===== Plans =====
export async function listPlans(): Promise<AdminPlanRow[]> {
  const r = await http().get('/admin/plans');
  return r.data.data;
}

export async function createPlan(payload: Partial<AdminPlanRow> & { code: string; name: string }) {
  const r = await http().post('/admin/plans', payload);
  return r.data.data;
}

export async function updatePlan(
  id: number,
  payload: Partial<Omit<AdminPlanRow, 'is_active'>> & { is_active?: boolean },
) {
  await http().patch(`/admin/plans/${id}`, payload);
}

export async function getPlanFeatures(planId: number): Promise<PlanFeatureRow[]> {
  const r = await http().get(`/admin/plans/${planId}/features`);
  return r.data.data;
}

export async function setPlanFeatures(
  planId: number,
  features: Array<{ code: string; enabled: boolean; limit?: number | null }>,
) {
  await http().put(`/admin/plans/${planId}/features`, { features });
}

// ===== Features (master) =====
export async function listFeatures(): Promise<AdminFeatureRow[]> {
  const r = await http().get('/admin/features');
  return r.data.data;
}

export async function createFeature(payload: { code: string; name: string; category?: string; sort_order?: number }) {
  const r = await http().post('/admin/features', payload);
  return r.data.data;
}

export async function updateFeature(
  id: number,
  payload: { name?: string; category?: string; sort_order?: number; is_active?: boolean },
) {
  await http().patch(`/admin/features/${id}`, payload);
}

// ===== Popups =====
export async function listPopups(): Promise<PopupRow[]> {
  const r = await http().get('/admin/popups');
  return r.data.data;
}

export async function updatePopup(
  id: number,
  payload: Partial<Omit<PopupRow, 'is_active'>> & { is_active?: boolean },
) {
  await http().patch(`/admin/popups/${id}`, payload);
}

// ===== Payments =====
export async function listPayments(): Promise<PaymentRow[]> {
  const r = await http().get('/admin/payments');
  return r.data.data;
}

export async function createPayment(payload: {
  user_id: number;
  plan_code?: string;
  amount: number;
  method?: string;
  status?: 'pending' | 'success';
  notes?: string;
}) {
  const r = await http().post('/admin/payments', payload);
  return r.data.data;
}

export async function approvePayment(id: number) {
  await http().post(`/admin/payments/${id}/approve`);
}

// ===== Devices =====
export async function revokeDevice(id: number) {
  await http().post(`/admin/devices/${id}/revoke`);
}
