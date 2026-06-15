import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, MessageSquare, Bell, BarChart2, Users } from "lucide-react";
import NewRequestToast from "@/components/NewRequestToast";
import { isAdminUser, canViewAllRequests } from "@/components/assignment/personnelList";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.email) {
        base44.entities.Notification.filter({ recipient_email: u.email, is_read: false })
          .then(n => setUnread(n.length))
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const navItems = [
    { page: "Home", icon: Home, label: "Home" },
    { page: "MyRequests", icon: ClipboardList, label: "Requests" },
    { page: "Inbox", icon: MessageSquare, label: "Inbox" },
    { page: "Notifications", icon: Bell, label: "Alerts", badge: unread },
    { page: "Analytics", icon: BarChart2, label: "Analytics", adminOnly: true },
    { page: "UserManagement", icon: Users, label: "Users", adminOnly: true },
  ];

  const noNavPages = ["Chat", "TARequest"];
  const showNav = !noNavPages.includes(currentPageName);

  return (
    <div className="min-h-screen bg-slate-50">
      <NewRequestToast />
      <style>{`
        :root {
          --font-sans: 'Inter', system-ui, sans-serif;
        }
        * { font-family: var(--font-sans); }
        body { background: #f8fafc; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      <div className={showNav ? "pb-20" : ""}>{children}</div>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 z-50 shadow-lg">
          <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
            {navItems.filter(item => !item.adminOnly || user?.role === "admin").map(item => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all relative ${
                    isActive
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : ""}`} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-indigo-600" : ""}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
