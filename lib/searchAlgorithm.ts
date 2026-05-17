import { UmkmItem } from '@/types/umkm';

export interface SearchFilterOptions {
  keyword?: string;
  kategoriList?: string[];
  lokasi?: string;
  minHarga?: number;
  maxHarga?: number;
  verifiedOnly?: boolean;
}

export function searchAndClusterUmkm(
  umkmList: UmkmItem[],
  filters?: SearchFilterOptions
): UmkmItem[] {
  let results = [...umkmList];
  
  if (!filters) return results;

  // 0. Filter by verification status
  if (filters.verifiedOnly) {
    results = results.filter((umkm: any) => umkm.status_verifikasi === 'terverifikasi');
  }

  // 1. Filter by category list (OR logic within categories)
  if (filters.kategoriList && filters.kategoriList.length > 0) {
    const lowerCategories = filters.kategoriList.map(c => c.toLowerCase());
    results = results.filter((umkm) => lowerCategories.includes(umkm.kategori.toLowerCase()));
  }

  // 2. Filter by location
  if (filters.lokasi && filters.lokasi.trim() !== '') {
    const lowerLokasi = filters.lokasi.toLowerCase();
    results = results.filter((umkm) => umkm.alamat && umkm.alamat.toLowerCase().includes(lowerLokasi));
  }

  // 3. Filter by price range
  if (filters.minHarga !== undefined || filters.maxHarga !== undefined) {
    const min = filters.minHarga ?? 0;
    const max = filters.maxHarga ?? Infinity;
    
    results = results.filter((umkm) => {
      // Check if UMKM has AT LEAST ONE product or equipment within price range
      const hasValidProduct = umkm.produk.some(p => {
        const price = p.harga || 0;
        return price >= min && price <= max;
      });
      const hasValidEquipment = umkm.equipment.some(e => {
        const price = e.harga_sewa || 0;
        return price >= min && price <= max;
      });
      return hasValidProduct || hasValidEquipment;
    });
  }

  // 4. Filter and score by keyword if provided
  if (filters.keyword && filters.keyword.trim() !== '') {
    const lowerKeyword = filters.keyword.toLowerCase().trim();

    const scoredResults = results.map((umkm) => {
      let score = 0;

      // Score 100 if UMKM name exactly matches
      if (umkm.nama_usaha.toLowerCase() === lowerKeyword) {
        score += 100;
      }
      // Score 50 if UMKM name contains keyword
      else if (umkm.nama_usaha.toLowerCase().includes(lowerKeyword)) {
        score += 50;
      }

      // Score 30 if category matches
      if (umkm.kategori.toLowerCase().includes(lowerKeyword)) {
        score += 30;
      }

      // Score 20 if address matches
      if (umkm.alamat.toLowerCase().includes(lowerKeyword)) {
        score += 20;
      }

      // Score 10 for each product/equipment match
      const productMatches = umkm.produk.filter((p) => p.nama.toLowerCase().includes(lowerKeyword)).length;
      const equipmentMatches = umkm.equipment.filter((e) => e.nama.toLowerCase().includes(lowerKeyword)).length;
      
      score += (productMatches + equipmentMatches) * 10;

      return { umkm, score };
    });

    // Filter out 0 scores
    const filteredAndScored = scoredResults.filter((item) => item.score > 0);

    // Sort by score descending
    filteredAndScored.sort((a, b) => b.score - a.score);

    results = filteredAndScored.map((item) => item.umkm);
  }

  return results;
}
