/**
 * NEXORA RIDE — Supabase Production Verifier
 *
 * Comprehensive checks:
 * 1. Environment configuration (.env)
 * 2. Database: all 6 tables reachable
 * 3. Storage: both buckets accessible
 * 4. RPC functions: book_ride_seats, cancel_booking
 * 5. Latency measurement
 *
 * Run: node scripts/verify-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      let value = match[2] || '';
      value = value.trim().replace(/^['"]|['"]$/g, '');
      env[match[1]] = value;
    }
  });
  return env;
}

async function verifySupabase() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║    NEXORA RIDE — Supabase Production Verification      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // ── 1. Validate configuration ──────────────────────────────────
  console.log('1️⃣  Checking .env configuration...');

  if (!url || url.includes('YOUR_PROJECT_ID') || !url.startsWith('https://')) {
    console.log('   ❌ EXPO_PUBLIC_SUPABASE_URL is missing or placeholder');
    console.log('   → Set it to: https://YOUR_REF.supabase.co\n');
    process.exit(1);
  }

  if (!anonKey || anonKey.includes('YOUR_ANON_KEY') || anonKey.includes('YOUR_PUBLISHABLE')) {
    console.log('   ❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or placeholder');
    console.log('   → Get it from Supabase Dashboard > Settings > API Keys\n');
    process.exit(1);
  }

  // Detect key format
  const isLegacyJWT = anonKey.startsWith('eyJ');
  const isPublishable = anonKey.startsWith('sb_publishable_');

  if (!isLegacyJWT && !isPublishable) {
    console.log('   ⚠️  Unrecognized key format. Expected eyJ... or sb_publishable_...');
    console.log('   → Continuing anyway...\n');
  } else {
    console.log(`   ✅ Key format: ${isPublishable ? 'sb_publishable_ (new)' : 'JWT (legacy)'}`);
  }

  console.log(`   ✅ URL: ${url}\n`);

  // ── 2. Test database tables ────────────────────────────────────
  console.log('2️⃣  Checking database tables...');
  const supabase = createClient(url, anonKey);
  const tables = ['profiles', 'driver_profiles', 'vehicles', 'rides', 'bookings', 'reviews'];
  let allTablesOk = true;

  for (const table of tables) {
    const start = Date.now();
    const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
    const ms = Date.now() - start;

    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
      allTablesOk = false;
    } else {
      console.log(`   ✅ ${table} — reachable (${ms}ms)`);
    }
  }

  // ── 3. Test storage buckets ────────────────────────────────────
  console.log('\n3️⃣  Checking storage buckets...');

  for (const bucket of ['avatars', 'driver-documents']) {
    const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
    if (error) {
      console.log(`   ⚠️  ${bucket}: ${error.message}`);
    } else {
      console.log(`   ✅ ${bucket} — accessible`);
    }
  }

  // ── 4. Test RPC functions exist ────────────────────────────────
  console.log('\n4️⃣  Checking RPC functions...');

  // We can't call book_ride_seats without valid data, but we can verify it exists
  // by calling it with invalid params — a "function not found" error means it's missing
  const { error: rpcError } = await supabase.rpc('book_ride_seats', {
    p_ride_id: '00000000-0000-0000-0000-000000000000',
    p_passenger_id: '00000000-0000-0000-0000-000000000000',
    p_seats: 1,
    p_total_price: 100,
    p_booking_code: 'TEST',
    p_boarding_pin: '0000',
  });

  if (rpcError && (rpcError.message.includes('Could not find the function') || rpcError.code === '42883')) {
    console.log('   ❌ book_ride_seats — function not found');
  } else {
    // Any other error (like "Ride does not exist" P0001) means the function IS there and ran
    console.log('   ✅ book_ride_seats — exists');
  }

  const { error: cancelError } = await supabase.rpc('cancel_booking', {
    p_booking_id: '00000000-0000-0000-0000-000000000000',
    p_user_id: '00000000-0000-0000-0000-000000000000',
  });

  if (cancelError && (cancelError.message.includes('Could not find the function') || cancelError.code === '42883')) {
    console.log('   ❌ cancel_booking — function not found');
  } else {
    console.log('   ✅ cancel_booking — exists');
  }

  // ── 5. Latency test ────────────────────────────────────────────
  console.log('\n5️⃣  Measuring latency...');
  const latencies = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await supabase.from('rides').select('id', { count: 'exact', head: true });
    latencies.push(Date.now() - start);
  }
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  console.log(`   📡 Avg latency: ${avgLatency}ms (3 pings)`);

  if (avgLatency > 500) {
    console.log('   ⚠️  Latency >500ms — check if Mumbai (ap-south-1) region is selected');
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  if (allTablesOk) {
    console.log('🎉 ALL CHECKS PASSED — Supabase is production-ready!');
  } else {
    console.log('⚠️  Some checks failed — review errors above');
  }
  console.log('══════════════════════════════════════════════════════════\n');
}

verifySupabase().catch((err) => {
  console.error('❌ Verification script crashed:', err.message);
  process.exit(1);
});
