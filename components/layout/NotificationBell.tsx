"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Bell, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Notification = {
  id: number;
  pesan: string;
  status: "belum dibaca" | "dibaca";
  tanggal: string;
  user_id: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("umkm");
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Stabilize supabase instance — never recreated
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  // Keep reference to active channel so we can remove it on cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role) {
      setUserRole(userData.role.toLowerCase());
    }

    const { data, error } = await supabase
      .from("notifikasi")
      .select("*")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    setNotifications(data as Notification[]);
    setUnreadCount(data.filter((n) => n.status === "belum dibaca").length);
  };

  useEffect(() => {
    fetchNotifications();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove previous channel before creating a new one
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Use unique channel name per user to avoid "same key" collision
      const channelName = `notifikasi_changes_${user.id}`;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifikasi",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
            setUnreadCount((prev) => prev + 1);
            
            // Show toast using react-hot-toast
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? "animate-enter" : "animate-leave"
                  } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                >
                  <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                          <Bell className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Notifikasi Baru
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {newNotif.pesan}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-l border-gray-200">
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ),
              { duration: 5000, position: "top-right" }
            );
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    // Cleanup: remove channel when component unmounts
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: setup only once on mount

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    const { error } = await supabase
      .from("notifikasi")
      .update({ status: "dibaca" })
      .eq("id", id);

    if (error) {
      console.error("Error marking as read:", error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "dibaca" } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    
    // Navigate based on role
    const targetRoute = userRole === "industri" ? "/pantau-transaksi" : "/dashboard/transaksi";
    router.push(targetRoute); 
    setIsOpen(false);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifikasi")
      .update({ status: "dibaca" })
      .eq("user_id", user.id)
      .eq("status", "belum dibaca");

    if (error) {
      console.error("Error marking all as read:", error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: "dibaca" }))
    );
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 bg-white hover:bg-slate-50 border border-slate-200 rounded-full relative transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {unreadCount} Baru
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length > 0 ? (
              <ul className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      notif.status === "belum dibaca" ? "bg-indigo-50/30" : "bg-white"
                    }`}
                    onClick={() => {
                      if (notif.status === "belum dibaca") {
                        markAsRead(notif.id);
                      } else {
                        const targetRoute = userRole === "industri" ? "/pantau-transaksi" : "/dashboard/transaksi";
                        router.push(targetRoute);
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          notif.status === "belum dibaca" 
                            ? "bg-indigo-100 text-indigo-600" 
                            : "bg-slate-100 text-slate-400"
                        }`}>
                          <Bell className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.status === "belum dibaca" ? "text-slate-800 font-medium" : "text-slate-600"}`}>
                          {notif.pesan}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          {formatDistanceToNow(new Date(notif.tanggal), { addSuffix: true, locale: localeId })}
                        </p>
                      </div>
                      {notif.status === "belum dibaca" && (
                        <div className="shrink-0 flex items-center">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <Bell className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-600">Belum ada notifikasi</p>
                <p className="text-xs text-slate-400 mt-1">Notifikasi baru akan muncul di sini.</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && unreadCount > 0 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={markAllAsRead}
                className="w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Tandai Semua Sudah Dibaca
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
