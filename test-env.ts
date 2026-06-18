import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
