import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: users } = await supabaseAdmin.from('users').select('id, email').eq('email', 'umkmanon2@gmail.com');
  if (users && users.length > 0) {
     const id = users[0].id;
     await supabaseAdmin.from('umkm').delete().eq('user_id', id);
     await supabaseAdmin.from('dokumen_legalitas').delete().eq('user_id', id);
     await supabaseAdmin.from('users').delete().eq('id', id);
     await supabaseAdmin.auth.admin.deleteUser(id);
     console.log('Deleted umkmanon2');
  } else {
     console.log('No umkmanon2 found');
  }
}
run();
