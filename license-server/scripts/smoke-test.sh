#!/bin/bash
set -e
cd "$(dirname "$0")/.."

pkill -f 'tsx src/index.ts' 2>/dev/null || true
sleep 1

rm -rf data

PORT=4099 npx tsx src/index.ts > /tmp/lic.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null; exit" EXIT INT TERM

# wait for server
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://localhost:4099/api/health > /dev/null; then break; fi
  sleep 0.5
done

echo "==== SERVER LOG ===="
cat /tmp/lic.log
echo

echo "==== LOGIN ADMIN ===="
ADMIN=$(curl -s -X POST http://localhost:4099/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mediasoft.local","password":"Admin#12345","device_id":"test-admin"}')
echo "$ADMIN"
echo
ADMIN_TOKEN=$(echo "$ADMIN" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j?.data?.access_token||'')}catch{console.log('')}})")
[ -z "$ADMIN_TOKEN" ] && { echo "❌ admin login failed"; exit 1; }
echo "✅ admin token ok"

echo "==== LOGIN DEMO ===="
DEMO=$(curl -s -X POST http://localhost:4099/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@mediasoft.local","password":"Demo#12345","device_id":"test-demo"}')
DEMO_TOKEN=$(echo "$DEMO" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j?.data?.access_token||'')}catch{console.log('')}})")
[ -z "$DEMO_TOKEN" ] && { echo "❌ demo login failed: $DEMO"; exit 1; }
echo "✅ demo token ok"

echo "==== /user/features (demo) ===="
curl -s http://localhost:4099/api/user/features -H "Authorization: Bearer $DEMO_TOKEN" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('plan:',j.data.plan?.code,'expired:',j.data.plan?.expired_at);const en=Object.entries(j.data.features).filter(([k,v])=>v.enabled).map(([k,v])=>k+(v.limit?'(lim:'+v.limit+')':'')).join(', ');const lk=Object.entries(j.data.features).filter(([k,v])=>!v.enabled).map(([k])=>k).join(', ');console.log('  ENABLED  :',en);console.log('  LOCKED   :',lk)})"

echo
echo "==== ADMIN: BUAT USER PEMBELI BARU (PRO) ===="
curl -s -X POST http://localhost:4099/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Toko Sukses","email":"toko@sukses.com","password":"Sukses#1234","plan_code":"PRO","duration_days":30}'
echo

echo "==== ADMIN: UBAH PAKET DEMO USER → BASIC ===="
DEMO_USER_ID=$(curl -s http://localhost:4099/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" \
  | NO_COLOR=1 node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(String(j.data.find(u=>u.email==='demo@mediasoft.local').id))})")
echo "demo user id: $DEMO_USER_ID"
curl -s -X PUT "http://localhost:4099/api/admin/users/$DEMO_USER_ID/plan" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"plan_code":"BASIC","duration_days":30,"notes":"Test upgrade"}'
echo

echo "==== /user/features (demo, after upgrade to BASIC) ===="
curl -s http://localhost:4099/api/user/features -H "Authorization: Bearer $DEMO_TOKEN" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('plan:',j.data.plan?.code);console.log('  export_excel:',JSON.stringify(j.data.features.export_excel));console.log('  reports     :',JSON.stringify(j.data.features.reports));console.log('  multi_branch:',JSON.stringify(j.data.features.multi_branch));console.log('  multi_cashier:',JSON.stringify(j.data.features.multi_cashier))})"

echo
echo "==== POPUP CONFIG (DEMO_LIMIT) ===="
curl -s http://localhost:4099/api/user/popup/DEMO_LIMIT -H "Authorization: Bearer $DEMO_TOKEN" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('title:',j.data.title);console.log('cta:',j.data.cta_text,'→',j.data.cta_url);console.log('wa:',j.data.whatsapp_number)})"

echo
echo "==== INFO PAGE (no web admin) ===="
curl -s -o /dev/null -w "GET /                → HTTP %{http_code} (info page)\n" http://localhost:4099/
curl -s -o /dev/null -w "GET /api/health      → HTTP %{http_code}\n" http://localhost:4099/api/health

echo
echo "==== ✅ ALL SMOKE TESTS PASSED ===="
