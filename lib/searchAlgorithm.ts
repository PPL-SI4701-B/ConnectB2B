import { UmkmItem } from '@/types/umkm';

export function searchAndClusterUmkm(
  umkmList: UmkmItem[],
  keyword?: string,
  kategoriFilter?: string
): UmkmItem[] {
  let results = [...umkmList];

  // 1. Filter by category if provided
  if (kategoriFilter && kategoriFilter.trim() !== '') {
    const lowerCategory = kategoriFilter.toLowerCase();
    results = results.filter((umkm) => umkm.kategori.toLowerCase() === lowerCategory);
  }

  // 2. Filter and score by keyword if provided
  if (keyword && keyword.trim() !== '') {
    const lowerKeyword = keyword.toLowerCase().trim();

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
