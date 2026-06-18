import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
async function run() {
  await supabase.auth.signInWithPassword({ email: 'admin@connectb2b.com', password: 'password123' });
  const { data } = await supabase.from('users').select('email, role').eq('role', 'umkm');
  console.log(data);
}
run();
