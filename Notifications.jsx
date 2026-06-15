import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, MessageSquare, FileText, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const typeConfig = {
  new_request: { icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  status_update: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
  new_message: { icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-50" },
  general: { icon: Bell, color: "text-slate-500", bg: "bg-slate-50" }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const notifs = await base44.entities.Notification.filter(
        { recipient_email: u?.email },
        "-created_date",
        50
      );
      setNotifications(notifs);
    } catch (e) {}
    setLoading(false);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const clearAll = async () => {
    await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    setNotifications([]);
  };

  const markRead = async (notif) => {
    if (!notif.is_read) {
      await base44.entities.Notification.update(notif.id, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-indigo-600 text-xs gap-1">
                <CheckCheck className="w-4 h-4" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-rose-500 text-xs gap-1">
                <Trash2 className="w-4 h-4" /> Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => {
              const tc = typeConfig[notif.type] || typeConfig.general;
              const Icon = tc.icon;
              const content = notif.link ? (
                <Link to={notif.link} onClick={() => markRead(notif)}>
                  <NotifCard notif={notif} tc={tc} Icon={Icon} />
                </Link>
              ) : (
                <div onClick={() => markRead(notif)}>
                  <NotifCard notif={notif} tc={tc} Icon={Icon} />
                </div>
              );
              return <div key={notif.id}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NotifCard({ notif, tc, Icon }) {
  return (
    <div className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm border transition-all cursor-pointer hover:shadow-md ${
      notif.is_read ? "border-slate-100" : "border-indigo-200 bg-indigo-50/30"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 ${tc.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${tc.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-800 text-sm line-clamp-1">{notif.title}</p>
            {!notif.is_read && <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
          <p className="text-xs text-slate-400 mt-1">
            {notif.created_date
              ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
