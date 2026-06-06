import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import KelolaPenggunaClient from './KelolaPenggunaClient';

export const metadata = {
  title: 'Manajemen Akun | ConnectB2B Admin',
  description: 'Kelola pengguna dan otorisasi akses ConnectB2B.',
};

export const dynamic = 'force-dynamic';

export default async function KelolaPenggunaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verifikasi role admin
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all users with their umkm and industri profiles
  const { data: usersData, error } = await supabase
    .from('users')
    .select(`
      id,
      nama,
      email,
      role,
      status_verifikasi,
      is_blocked,
      umkm (nama_usaha),
      industri (nama_perusahaan)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
  }

  // Format data for client
  const formattedUsers = (usersData || []).map((u: any) => {
    let businessName = null;
    if (u.role === 'umkm' && u.umkm && u.umkm.length > 0) {
      businessName = u.umkm[0].nama_usaha;
    } else if (u.role === 'industri' && u.industri && u.industri.length > 0) {
      businessName = u.industri[0].nama_perusahaan;
    }

    return {
      id: u.id,
      nama: u.nama,
      email: u.email,
      role: u.role,
      status_verifikasi: u.status_verifikasi,
      is_blocked: u.is_blocked || false,
      businessName
    };
  });

  return <KelolaPenggunaClient initialUsers={formattedUsers} />;
}
