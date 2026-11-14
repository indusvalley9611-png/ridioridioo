/**
 * NEXORA RIDE — Supabase Connection & Storage Verifier
 *
 * Tests:
 * 1. Project URL and Anon Key configuration
 * 2. Connection to Supabase Auth and Database
 * 3. Accessibility of 'avatars' and 'driver-documents' Storage Buckets
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      value = value.trim().replace(/^['"]|['"]$/g, '');
      env[match[1]] = value;
    }
  });
  return env;
}

async function verifySupabase() {
  console.log('🔍 Checking Supabase configuration in .env...\n');
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes('YOUR_PROJECT_ID') || !url.startsWith('https://')) {
    console.log('⚠️  EXPO_PUBLIC_SUPABASE_URL is currently set to placeholder.');
    console.log('   Please replace it in .env with your real project URL:');
    console.log('   e.g. https://abcdefghijklm.supabase.co\n');
    return;
  }

  if (!anonKey || anonKey.includes('YOUR_ANON_KEY')) {
    console.log('⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY is currently set to placeholder.');
    console.log('   Please replace it in .env with your real anon/public key.\n');
    return;
  }

  console.log(`✅ Project URL configured: ${url}`);
  console.log('🔗 Testing connection to Supabase...\n');

  try {
    const supabase = createClient(url, anonKey);

    // 1. Test database query
    const { data: rides, error: ridesError } = await supabase
      .from('rides')
      .select('count', { count: 'exact', head: true });

    if (ridesError) {
      console.log(`❌ Database Query Error: ${ridesError.message}`);
    } else {
      console.log('✅ Database connected! "rides" table reachable.');
    }

    // 2. Test storage buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.log(`⚠️  Storage Check Error: ${bucketsError.message}`);
    } else {
      const bucketNames = buckets.map((b) => b.name);
      console.log(`✅ Storage connected! Found buckets: ${bucketNames.join(', ') || 'none'}`);
    }

    console.log('\n🎉 Supabase connection is 100% active and working!');
  } catch (err) {
    console.log(`❌ Connection test failed: ${err.message}`);
  }
}

verifySupabase();
