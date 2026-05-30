import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'ind1@dummy.com',
    password: 'password123'
  });

  const { data, error } = await supabase
    .from('transaksi')
    .update({
      status_validasi: 'tidak valid',
      status: 'belum lunas'
    })
    .eq('id', 7)
    .select();

  console.log("UPDATE RESULT FOR 'tidak valid':");
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
