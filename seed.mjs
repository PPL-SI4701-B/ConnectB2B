import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nkhxgsuhchngdiugomju.supabase.co'
const ANON_KEY = 'sb_publishable_BIvHGddDDjdTsgZURZaImg_u_qhkIF-'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function seed() {
  const umkms = [
    { email: 'umkm1@dummy.com', nama: 'Budi Katering', role: 'umkm' },
    { email: 'umkm2@dummy.com', nama: 'Sinta Konveksi', role: 'umkm' },
    { email: 'umkm3@dummy.com', nama: 'Agus Kriya Kayu', role: 'umkm' },
    { email: 'umkm4@dummy.com', nama: 'Rina Snack', role: 'umkm' },
    { email: 'umkm5@dummy.com', nama: 'Toko Kemasan', role: 'umkm' },
    { email: 'umkm6@dummy.com', nama: 'Layanan Bersih', role: 'umkm' },
  ]
  const industris = [
    { email: 'ind1@dummy.com', nama: 'PT Pangan Makmur', role: 'industri' },
    { email: 'ind2@dummy.com', nama: 'PT Gaya Nusantara', role: 'industri' },
    { email: 'ind3@dummy.com', nama: 'CV Mebel Indah', role: 'industri' },
    { email: 'ind4@dummy.com', nama: 'PT Ritel Sentosa', role: 'industri' },
    { email: 'ind5@dummy.com', nama: 'Grup Manufaktur', role: 'industri' },
  ]

  console.log('Signing up users...')

  for (const u of umkms) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: 'password123',
      options: {
        data: {
          role: u.role,
          nama: u.nama,
          nama_usaha: u.nama
        }
      }
    })
    if (error) console.error(`Error ${u.email}:`, error.message)
    else console.log(`Created ${u.email}: ${data.user?.id}`)
  }

  for (const u of industris) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: 'password123',
      options: {
        data: {
          role: u.role,
          nama: u.nama,
          nama_perusahaan: u.nama
        }
      }
    })
    if (error) console.error(`Error ${u.email}:`, error.message)
    else console.log(`Created ${u.email}: ${data.user?.id}`)
  }

  console.log('Done signing up users.')
}

seed()
