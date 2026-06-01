import { redirect } from "next/navigation";

type SearchParams = { transaksi_id?: string };

export default async function UlasanRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (params?.transaksi_id) {
    redirect(`/beri-ulasan?transaksi_id=${params.transaksi_id}`);
  }
  redirect("/beri-ulasan");
}
