import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestMasukClient from './RequestMasukClient';
import { acceptRequest, rejectRequest } from '@/app/actions/request-actions';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/app/actions/request-actions', () => ({
  acceptRequest: jest.fn(),
  rejectRequest: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/layout/NotificationBell', () => {
  return function MockNotificationBell() {
    return <div data-testid="notification-bell">Bell</div>;
  };
});

// Mock formatDistanceToNow to avoid date localization issues during tests
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  formatDistanceToNow: jest.fn(() => '1 hari yang lalu'),
}));

const mockRequests = [
  {
    id: 1,
    pesan: 'Pesan test',
    status: 'pending',
    tanggal_request: '2024-01-01T00:00:00.000Z',
    industri_nama: 'PT Industri Test',
    industri_lokasi: 'Jakarta',
    initials: 'PT',
  }
];

describe('RequestMasukClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-14-01: Terima request (Klik Terima -> Status=approve, notif terkirim)', async () => {
    render(<RequestMasukClient requests={mockRequests} umkmName="UMKM Test" />);
    
    const terimaButton = screen.getByText('Terima & Buat Transaksi');
    fireEvent.click(terimaButton);

    await waitFor(() => {
      expect(acceptRequest).toHaveBeenCalledWith(1);
    });
    
    expect(toast.success).toHaveBeenCalledWith('Request diterima! Transaksi telah dibuat.');
    // Check if the badge for approved status is rendered
    expect(screen.getByText('Request Diterima')).toBeInTheDocument();
  });

  test('TC-14-02: Tolak request (Klik Tolak -> Status=ditolak, notif terkirim)', async () => {
    render(<RequestMasukClient requests={mockRequests} umkmName="UMKM Test" />);
    
    const tolakButton = screen.getByText('Tolak Request');
    fireEvent.click(tolakButton);

    await waitFor(() => {
      expect(rejectRequest).toHaveBeenCalledWith(1);
    });

    expect(toast.success).toHaveBeenCalledWith('Request ditolak. Notifikasi dikirim ke pengirim.');
    // Check if the badge for rejected status is rendered
    expect(screen.getByText('Request Ditolak')).toBeInTheDocument();
  });
});
