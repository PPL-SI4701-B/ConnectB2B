import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nkhxgsuhchngdiugomju.supabase.co'
const ANON_KEY = 'sb_publishable_BIvHGddDDjdTsgZURZaImg_u_qhkIF-'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function createAdmin() {
  const email = 'admin@connectb2b.com'
  const password = 'adminpassword123'
  
  console.log(`Attempting to create admin user: ${email}`)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'admin',
        nama: 'Super Admin'
      }
    }
  })
  
  if (error) {
    console.error('Error creating admin:', error.message)
    if (error.message.includes('already registered')) {
        console.log('Admin user already exists. You can try to login with it.')
    }
  } else {
    console.log('Admin user created successfully:', data.user?.id)
  }
}

createAdmin()
