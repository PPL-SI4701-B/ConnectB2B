import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nkhxgsuhchngdiugomju.supabase.co'
const ANON_KEY = 'sb_publishable_BIvHGddDDjdTsgZURZaImg_u_qhkIF-'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function listUsers() {
  const { data, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('Error fetching users:', error)
  } else {
    console.log('Users:', JSON.stringify(data, null, 2))
  }
}

listUsers()
