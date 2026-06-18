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

  const { data: trxList } = await supabase.from('transaksi').select('id').limit(1);
  if (!trxList || trxList.length === 0) return console.log("no trx");

  const { error: updError } = await supabase
    .from("transaksi")
    .update({ progress_status: "Komplain Diajukan" })
    .eq("id", trxList[0].id);

  console.log("updError:", updError);
}
run();
