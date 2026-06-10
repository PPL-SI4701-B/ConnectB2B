import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const adminEmail = process.env.E2E_ADMIN_EMAIL!;
  const adminPass = process.env.E2E_ADMIN_PASSWORD!;
  const umkmEmail = process.env.E2E_UMKM_EMAIL!;

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPass });
  console.log("Auth:", authErr ? authErr : "SUCCESS");

  const { data } = await supabase.from('users').select('id').eq('email', umkmEmail).single();
  const umkmUserId = data?.id;

  const { data: rpcData, error: rpcErr } = await supabase.rpc('kirim_notifikasi', {
    p_target_user_id: umkmUserId,
    p_pesan: 'E2E_TEST_NOTIF: Permintaan kerja sama baru',
  });
  console.log("RPC:", rpcErr ? rpcErr : "SUCCESS", rpcData);
}
run();
