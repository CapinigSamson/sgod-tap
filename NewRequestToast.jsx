import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Bell, X, FileText } from "lucide-react";
import { isAdminUser } from "@/components/assignment/personnelList";

export default function NewRequestToast() {
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAdminUser(user) && user.role !== "admin") return;

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.type === "new_request") {
        const notif = event.data;
        // Only show if intended for this user
        if (notif.recipient_email && notif.recipient_email !== user.email) return;
        const id = Date.now();
        setToasts(prev => [...prev, { id, notif }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 8000);
      }
    });

    return () => unsub();
  }, [user]);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map(({ id, notif }) => (
        <div
          key={id}
          className="bg-white border border-indigo-200 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-right"
        >
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{notif.title || "New Request"}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
            {notif.link && (
              <Link
                to={notif.link}
                onClick={() => dismiss(id)}
                className="text-xs text-indigo-600 font-medium mt-1 inline-block hover:underline"
              >
                View Request →
              </Link>
            )}
          </div>
          <button onClick={() => dismiss(id)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
