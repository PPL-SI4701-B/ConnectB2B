import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually parse .env.local
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

async function reset() {
  console.log("=== RESETTING TRX-0007 TO AWAITING PAYMENT STATE ===");
  
  // Sign in as Budi Katering (umkm1@dummy.com)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'umkm1@dummy.com',
    password: 'password123'
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }
  console.log("Logged in as Budi Katering successfully!");

  // 1. Delete pembayaran for transaksi_id = 7
  const { error: deletePayError } = await supabase
    .from('pembayaran')
    .delete()
    .eq('transaksi_id', 7);

  if (deletePayError) {
    console.error("Error deleting payment record:", deletePayError);
  } else {
    console.log("Deleted payment records for TRX-0007 successfully!");
  }

  // 2. Update transaksi set status_validasi = 'tidak valid', status = 'belum lunas'
  const { error: updateTxError } = await supabase
    .from('transaksi')
    .update({
      status_validasi: 'tidak valid',
      status: 'belum lunas'
    })
    .eq('id', 7);

  if (updateTxError) {
    console.error("Error updating transaction:", updateTxError);
  } else {
    console.log("Updated TRX-0007 back to Awaiting Payment status!");
  }
}

reset();
