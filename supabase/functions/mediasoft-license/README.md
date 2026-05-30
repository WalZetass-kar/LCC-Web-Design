# MediaSoft License Edge Function

Endpoint produksi setelah deploy:

```text
https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license
```

Endpoint yang tersedia:

```text
GET  /health
POST /auth/login
POST /register-trial
POST /check-license
POST /validate-device
GET  /active-features?email=user@example.com
GET  /popup/EXPIRED
GET  /admin/plans
POST /admin/plans
PATCH /admin/plans/:id
DELETE /admin/plans/:id
GET  /admin/plans/:id/features
PUT  /admin/plans/:id/features
GET  /admin/popups
GET  /admin/users
GET  /admin/payments
POST /admin/payments
POST /admin/payments/:id/approve
DELETE /admin/payments/:id
```

Deployment ringkas:

```bash
supabase login
supabase link --project-ref PROJECT_ID
supabase db push
supabase functions deploy mediasoft-license
```

Supabase menyediakan `SUPABASE_URL` dan service role key untuk Edge Functions.
Jika project Anda tidak otomatis mengekspos service role key, set secret:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Setelah membuat user admin di Supabase Auth, berikan role admin:

```sql
insert into public.license_admins (user_id, role)
values ('AUTH_USER_ID', 'super_admin')
on conflict (user_id) do update set role = excluded.role, is_active = true;
```

Di aplikasi POS, isi License Center dengan:

```text
https://PROJECT_ID.supabase.co/functions/v1/mediasoft-license
```
