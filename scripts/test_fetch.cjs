const https = require('https');

const baseUrl = 'https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license';
const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImM5ZGQ5M2VlLTU2MjAtNDJmMi1hMWM3LTY2MDQyOGI4ODg3NCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F6aGt2bWttaW1lcG1mbHpxcXR5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhNmE5OWJkYi1jNWRjLTQ5ZDgtODhlYi1mMGIyNWNmNTFlMjIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgwMjM2NjQ1LCJpYXQiOjE3ODAyMzMwNDUsImVtYWlsIjoiYWRtaW5AbGNjLXdlYi1kZXNpZ24ubG9jYWwiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiU3VwZXIgQWRtaW4ifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MDE0NzgyM31dLCJzZXNzaW9uX2lkIjoiOTllNDM4ODMtMmI1NC00NGI0LWJlMTgtYzAxMTRlNDk0M2U1IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.jpuvu-aYUHLtUN7hSIF4L6SerpHScVKqRjw7jDUymQbB9BeiWQMPWQuwgi8ghSG2MheORG27qP6awWkUlW2_yw';

console.log('Using Base URL:', baseUrl);

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('\n--- Fetching Public Plans (/plans) ---');
    const pubUrl = `${baseUrl}/plans`;
    const pubRes = await fetchUrl(pubUrl);
    console.log(JSON.stringify(pubRes, null, 2));

    console.log('\n--- Fetching Admin Plans (/admin/plans) ---');
    const adminUrl = `${baseUrl}/admin/plans`;
    const adminRes = await fetchUrl(adminUrl, { Authorization: `Bearer ${token}` });
    console.log(JSON.stringify(adminRes, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
