import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_ADMIN_EMAIL!,
    password: process.env.E2E_ADMIN_PASSWORD!
  });
  console.log("auth", !!user);

  // Cari transaksi yang valid (sebarang transaksi untuk industri1)
  const { data: trxList } = await supabase.from('transaksi').select('id').limit(1);
  if (!trxList || trxList.length === 0) return console.log("no trx");

  const { error: histError } = await supabase
    .from("transaksi_history")
    .insert({
      transaksi_id: trxList[0].id,
      status_progress: "Komplain Diajukan",
      pesan: "test",
    });

  console.log("histError:", histError);
}
run();
