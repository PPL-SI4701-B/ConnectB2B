import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch role and basic user info
  const { data: userData } = await supabase
    .from('users')
    .select('role, email, status_verifikasi, nama')
    .eq('id', user.id)
    .single();

  if (!userData) {
    redirect('/login');
  }

  const role = userData.role;

  // Fetch profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch umkm or industri data depending on role
  let entityData = null;
  if (role === 'umkm') {
    const { data } = await supabase
      .from('umkm')
      .select('*')
      .eq('user_id', user.id)
      .single();
    entityData = data;
  } else if (role === 'industri') {
    const { data } = await supabase
      .from('industri')
      .select('*')
      .eq('user_id', user.id)
      .single();
    entityData = data;
  }

  // Fetch categories
  const { data: categories } = await supabase
    .from('kategori')
    .select('*')
    .order('nama_kategori');

  // We fetch documents to show status (from mockup)
  const { data: documents } = await supabase
    .from('dokumen_legalitas')
    .select('*')
    .eq('user_id', user.id);

  return (
    // Render ProfileClient component for UMKM or Industri profile view
    <ProfileClient 
      userId={user.id}
      userEmail={userData.email}
      userName={userData.nama}
      role={role}
      statusVerifikasi={userData.status_verifikasi}
      profileData={profileData}
      entityData={entityData}
      categories={categories || []}
      documents={documents || []}
    />
  );
}
