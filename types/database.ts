export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      detail_transaksi: {
        Row: {
          equipment_id: number | null
          harga_satuan: number
          id: number
          kuantitas: number
          produk_id: number | null
          subtotal: number
          transaksi_id: number
        }
        Insert: {
          equipment_id?: number | null
          harga_satuan?: number
          id?: number
          kuantitas?: number
          produk_id?: number | null
          subtotal?: number
          transaksi_id: number
        }
        Update: {
          equipment_id?: number | null
          harga_satuan?: number
          id?: number
          kuantitas?: number
          produk_id?: number | null
          subtotal?: number
          transaksi_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "detail_transaksi_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_transaksi_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "produk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_transaksi_transaksi_id_fkey"
            columns: ["transaksi_id"]
            isOneToOne: false
            referencedRelation: "transaksi"
            referencedColumns: ["id"]
          },
        ]
      }
      dokumen_legalitas: {
        Row: {
          catatan_admin: string | null
          created_at: string
          file_url: string
          id: number
          jenis_dokumen: string
          status_verifikasi: Database["public"]["Enums"]["verifikasi_status"]
          user_id: string
        }
        Insert: {
          catatan_admin?: string | null
          created_at?: string
          file_url: string
          id?: number
          jenis_dokumen: string
          status_verifikasi?: Database["public"]["Enums"]["verifikasi_status"]
          user_id: string
        }
        Update: {
          catatan_admin?: string | null
          created_at?: string
          file_url?: string
          id?: number
          jenis_dokumen?: string
          status_verifikasi?: Database["public"]["Enums"]["verifikasi_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dokumen_legalitas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dokumen_legalitas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          deskripsi: string | null
          harga_sewa: number | null
          id: number
          nama: string
          status: Database["public"]["Enums"]["equipment_status"] | null
          stok: number | null
          user_id: string
        }
        Insert: {
          deskripsi?: string | null
          harga_sewa?: number | null
          id?: number
          nama: string
          status?: Database["public"]["Enums"]["equipment_status"] | null
          stok?: number | null
          user_id: string
        }
        Update: {
          deskripsi?: string | null
          harga_sewa?: number | null
          id?: number
          nama?: string
          status?: Database["public"]["Enums"]["equipment_status"] | null
          stok?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      industri: {
        Row: {
          id: number
          kategori_id: number | null
          lokasi: string | null
          nama_perusahaan: string
          user_id: string
        }
        Insert: {
          id?: number
          kategori_id?: number | null
          lokasi?: string | null
          nama_perusahaan: string
          user_id: string
        }
        Update: {
          id?: number
          kategori_id?: number | null
          lokasi?: string | null
          nama_perusahaan?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "industri_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industri_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "industri_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kategori: {
        Row: {
          deskripsi: string | null
          id: number
          nama_kategori: string
        }
        Insert: {
          deskripsi?: string | null
          id?: number
          nama_kategori: string
        }
        Update: {
          deskripsi?: string | null
          id?: number
          nama_kategori?: string
        }
        Relationships: []
      }
      keranjang: {
        Row: {
          equipment_id: number | null
          id: number
          industri_id: number
          kuantitas: number
          produk_id: number | null
        }
        Insert: {
          equipment_id?: number | null
          id?: number
          industri_id: number
          kuantitas?: number
          produk_id?: number | null
        }
        Update: {
          equipment_id?: number | null
          id?: number
          industri_id?: number
          kuantitas?: number
          produk_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keranjang_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keranjang_industri_id_fkey"
            columns: ["industri_id"]
            isOneToOne: false
            referencedRelation: "industri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keranjang_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "produk"
            referencedColumns: ["id"]
          },
        ]
      }
      notifikasi: {
        Row: {
          id: number
          pesan: string
          status: Database["public"]["Enums"]["notifikasi_status"]
          tanggal: string
          user_id: string
        }
        Insert: {
          id?: number
          pesan: string
          status?: Database["public"]["Enums"]["notifikasi_status"]
          tanggal?: string
          user_id: string
        }
        Update: {
          id?: number
          pesan?: string
          status?: Database["public"]["Enums"]["notifikasi_status"]
          tanggal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifikasi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifikasi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pembayaran: {
        Row: {
          bukti_transfer: string | null
          id: number
          status: Database["public"]["Enums"]["pembayaran_status"]
          tanggal_bayar: string
          transaksi_id: number
        }
        Insert: {
          bukti_transfer?: string | null
          id?: number
          status?: Database["public"]["Enums"]["pembayaran_status"]
          tanggal_bayar?: string
          transaksi_id: number
        }
        Update: {
          bukti_transfer?: string | null
          id?: number
          status?: Database["public"]["Enums"]["pembayaran_status"]
          tanggal_bayar?: string
          transaksi_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pembayaran_transaksi_id_fkey"
            columns: ["transaksi_id"]
            isOneToOne: false
            referencedRelation: "transaksi"
            referencedColumns: ["id"]
          },
        ]
      }
      produk: {
        Row: {
          deskripsi: string | null
          gambar_url: string | null
          harga: number | null
          id: number
          kategori: string | null
          nama: string
          stok: number | null
          user_id: string
        }
        Insert: {
          deskripsi?: string | null
          gambar_url?: string | null
          harga?: number | null
          id?: number
          kategori?: string | null
          nama: string
          stok?: number | null
          user_id: string
        }
        Update: {
          deskripsi?: string | null
          gambar_url?: string | null
          harga?: number | null
          id?: number
          kategori?: string | null
          nama?: string
          stok?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produk_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "produk_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          deskripsi: string | null
          id: number
          kontak: string | null
          lokasi: string | null
          user_id: string
        }
        Insert: {
          deskripsi?: string | null
          id?: number
          kontak?: string | null
          lokasi?: string | null
          user_id: string
        }
        Update: {
          deskripsi?: string | null
          id?: number
          kontak?: string | null
          lokasi?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      request: {
        Row: {
          equipment_id: number | null
          id: number
          industri_id: number | null
          pesan: string | null
          produk_id: number | null
          status: Database["public"]["Enums"]["request_status"]
          tanggal_request: string
          umkm_id: number
        }
        Insert: {
          equipment_id?: number | null
          id?: number
          industri_id?: number | null
          pesan?: string | null
          produk_id?: number | null
          status?: Database["public"]["Enums"]["request_status"]
          tanggal_request?: string
          umkm_id: number
        }
        Update: {
          equipment_id?: number | null
          id?: number
          industri_id?: number | null
          pesan?: string | null
          produk_id?: number | null
          status?: Database["public"]["Enums"]["request_status"]
          tanggal_request?: string
          umkm_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_industri_id_fkey"
            columns: ["industri_id"]
            isOneToOne: false
            referencedRelation: "industri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "produk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_umkm_id_fkey"
            columns: ["umkm_id"]
            isOneToOne: false
            referencedRelation: "umkm"
            referencedColumns: ["id"]
          },
        ]
      }
      transaksi: {
        Row: {
          admin_id: string | null
          id: number
          request_id: number
          status: Database["public"]["Enums"]["transaksi_status"]
          status_validasi: Database["public"]["Enums"]["validasi_status"]
          tanggal_mulai: string
          tanggal_selesai: string | null
        }
        Insert: {
          admin_id?: string | null
          id?: number
          request_id: number
          status?: Database["public"]["Enums"]["transaksi_status"]
          status_validasi?: Database["public"]["Enums"]["validasi_status"]
          tanggal_mulai?: string
          tanggal_selesai?: string | null
        }
        Update: {
          admin_id?: string | null
          id?: number
          request_id?: number
          status?: Database["public"]["Enums"]["transaksi_status"]
          status_validasi?: Database["public"]["Enums"]["validasi_status"]
          tanggal_mulai?: string
          tanggal_selesai?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transaksi_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request"
            referencedColumns: ["id"]
          },
        ]
      }
      ulasan: {
        Row: {
          id: number
          komentar: string | null
          rating: number
          tanggal: string
          transaksi_id: number
        }
        Insert: {
          id?: number
          komentar?: string | null
          rating: number
          tanggal?: string
          transaksi_id: number
        }
        Update: {
          id?: number
          komentar?: string | null
          rating?: number
          tanggal?: string
          transaksi_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ulasan_transaksi_id_fkey"
            columns: ["transaksi_id"]
            isOneToOne: false
            referencedRelation: "transaksi"
            referencedColumns: ["id"]
          },
        ]
      }
      umkm: {
        Row: {
          alamat: string | null
          deskripsi: string | null
          id: number
          kategori_id: number | null
          nama_usaha: string
          user_id: string
        }
        Insert: {
          alamat?: string | null
          deskripsi?: string | null
          id?: number
          kategori_id?: number | null
          nama_usaha: string
          user_id: string
        }
        Update: {
          alamat?: string | null
          deskripsi?: string | null
          id?: number
          kategori_id?: number | null
          nama_usaha?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "umkm_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umkm_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "umkm_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          nama: string
          role: Database["public"]["Enums"]["user_role"]
          status_verifikasi: Database["public"]["Enums"]["verifikasi_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nama: string
          role?: Database["public"]["Enums"]["user_role"]
          status_verifikasi?: Database["public"]["Enums"]["verifikasi_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nama?: string
          role?: Database["public"]["Enums"]["user_role"]
          status_verifikasi?: Database["public"]["Enums"]["verifikasi_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "pending_verifications"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pending_verifications: {
        Row: {
          dokumen_list: Json | null
          email: string | null
          nama_entitas: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
          user_status: Database["public"]["Enums"]["verifikasi_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      equipment_status: "tersedia" | "tidak tersedia"
      notifikasi_status: "belum dibaca" | "dibaca"
      pembayaran_status: "pending" | "berhasil" | "gagal"
      request_status: "pending" | "approve" | "ditolak"
      transaksi_status: "belum lunas" | "lunas"
      user_role: "industri" | "umkm" | "admin"
      validasi_status: "menunggu" | "valid" | "tidak valid"
      verifikasi_status: "menunggu" | "terverifikasi" | "ditolak"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      equipment_status: ["tersedia", "tidak tersedia"],
      notifikasi_status: ["belum dibaca", "dibaca"],
      pembayaran_status: ["pending", "berhasil", "gagal"],
      request_status: ["pending", "approve", "ditolak"],
      transaksi_status: ["belum lunas", "lunas"],
      user_role: ["industri", "umkm", "admin"],
      validasi_status: ["menunggu", "valid", "tidak valid"],
      verifikasi_status: ["menunggu", "terverifikasi", "ditolak"],
    },
  },
} as const
