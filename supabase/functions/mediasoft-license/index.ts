import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathname = url.pathname;
    
    const body = await req.json().catch(() => ({}));

    if (pathname.endsWith("/generate") && req.method === "POST") {
      const adminSecret = req.headers.get("x-admin-secret");
      if (adminSecret !== Deno.env.get("ADMIN_SECRET")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const { customerName, email, plan = "STANDARD", maxDevices = 1, durationDays = 365, companyName = "" } = body;
      
      if (!email || !customerName) {
        throw new Error("Missing required fields: email or customerName");
      }

      const crypto = globalThis.crypto;
      const array = new Uint32Array(3);
      crypto.getRandomValues(array);
      const licenseKey = `ZETASS-${array[0].toString(16).toUpperCase()}-${array[1].toString(16).toUpperCase()}-${array[2].toString(16).toUpperCase()}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // 1. Look up subscription_plans by code (array, always 200)
      const { data: planRecords, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, code, name, max_devices, duration_days')
        .eq('code', plan)

      if (planError) throw planError;
      const planRecord = (planRecords || [])[0];
      if (!planRecord) {
        throw new Error(`Plan '${plan}' not found in subscription_plans`);
      }

      // 2. Create customer in license_customers
      const { data: customers, error: customerError } = await supabase
        .from('license_customers')
        .insert([{
          name: customerName,
          email: email,
          metadata: {
            company_name: companyName,
            license_key: licenseKey,
          },
          status: 'ACTIVE',
        }])
        .select()

      if (customerError) throw customerError;
      const customer = (customers || [])[0];
      if (!customer) throw new Error("Failed to create customer");

      // 3. Create subscription in customer_subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('customer_subscriptions')
        .insert([{
          customer_id: customer.id,
          plan_id: planRecord.id,
          status: 'ACTIVE',
          expires_at: expiresAt.toISOString(),
          started_at: new Date().toISOString(),
          notes: licenseKey,
          source: 'admin_generated',
        }])
        .select()

      if (subError) throw subError;
      const subscription = (subscriptions || [])[0];
      if (!subscription) throw new Error("Failed to create subscription");

      return new Response(JSON.stringify({ 
        success: true, 
        customer_id: customer.id,
        subscription_id: subscription.id,
        license_key: licenseKey,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pathname.endsWith("/validate") && req.method === "POST") {
      const { email, licenseKey, deviceId, deviceName, os, appVersion } = body;

      if (!email || !licenseKey || !deviceId) {
        throw new Error("Missing credentials");
      }

      // 1. Look up customer by email (array, always 200)
      const { data: customers, error: customerError } = await supabase
        .from('license_customers')
        .select('id, name, email, status, metadata')
        .eq('email', email)

      if (customerError) throw customerError;
      const customer = (customers || [])[0];
      if (!customer) {
        throw new Error("Customer not found");
      }

      const meta = (customer.metadata || {}) as Record<string, unknown>;
      if (meta.license_key !== licenseKey) {
        throw new Error("Invalid license key or email");
      }

      if (customer.status !== 'ACTIVE') {
        throw new Error(`License is ${customer.status}`);
      }

      // 2. Get active subscription (array, always 200)
      const { data: subscriptions, error: subError } = await supabase
        .from('customer_subscriptions')
        .select('id, status, expires_at, plan_id')
        .eq('customer_id', customer.id)
        .eq('status', 'ACTIVE')

      if (subError) throw subError;
      const subscription = (subscriptions || [])[0];
      if (!subscription) {
        throw new Error("No active subscription found");
      }

      if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        throw new Error("License has expired");
      }

      // 3. Get plan details for max_devices (array, always 200)
      const { data: planRecords, error: planError } = await supabase
        .from('subscription_plans')
        .select('max_devices')
        .eq('id', subscription.plan_id)

      if (planError) throw planError;
      const planRecord = (planRecords || [])[0];

      // 4. Check device registration
      const { data: existingDevices, error: devicesError } = await supabase
        .from('customer_devices')
        .select('*')
        .eq('customer_id', customer.id);

      if (devicesError) throw devicesError;

      const isRegistered = (existingDevices || []).some((d: any) => d.device_id === deviceId);

      if (!isRegistered) {
        if ((existingDevices || []).length >= (planRecord?.max_devices ?? 1)) {
          throw new Error("Device limit reached for this license");
        }
        
        const { error: insertError } = await supabase
          .from('customer_devices')
          .insert([{
            customer_id: customer.id,
            device_id: deviceId,
            device_name: deviceName || null,
            os_name: os || null,
            app_version: appVersion || null,
            last_seen_at: new Date().toISOString(),
            status: 'active',
          }]);
          
        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Device validated",
        customer_id: customer.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Route not found" }), { 
      status: 404, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
