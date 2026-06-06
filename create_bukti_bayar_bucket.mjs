import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkhxgsuhchngdiugomju.supabase.co';
const ANON_KEY = 'sb_publishable_BIvHGddDDjdTsgZURZaImg_u_qhkIF-';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  console.log("Attempting to create 'bukti-bayar' storage bucket...");
  
  // We will sign in as admin using the credentials in create_admin.mjs
  const email = 'admin@connectb2b.com';
  const password = 'adminpassword123';
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error("Auth error:", authError.message);
  } else {
    console.log("Logged in as admin:", authData.user?.id);
  }
  
  // Create bucket
  const { data, error } = await supabase.storage.createBucket('bukti-bayar', {
    public: true,
  });
  
  if (error) {
    console.error("Error creating bucket:", error.message);
    if (error.message.includes("already exists") || error.message.includes("Duplicate")) {
      console.log("Bucket already exists!");
    }
  } else {
    console.log("Bucket created successfully:", data);
  }
}

run();
