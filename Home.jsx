import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  School, Building2, Users, BarChart3, Network, UserCog, HeadphonesIcon,
  ChevronRight, Bell, MessageSquare, Plus, Clock, CheckCircle, AlertCircle, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UserProfileMenu from "@/components/UserProfileMenu";

const menuItems = [
  {
    id: "sbm",
    label: "SBM Concerns",
    description: "School-Based Management",
    icon: School,
    color: "from-blue-500 to-blue-600",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
    hasSubMenu: false,
    directCategory: "SBM Concerns"
  },
  {
    id: "private",
    label: "Private School Concerns",
    description: "Permit Renewal · TOSF · Special Order",
    icon: Building2,
    color: "from-violet-500 to-violet-600",
    lightColor: "bg-violet-50",
    textColor: "text-violet-600",
    hasSubMenu: true,
    subItems: [
      { label: "Permit Renewal", category: "Private School - Permit Renewal" },
      { label: "TOSF", category: "Private School - TOSF" },
      { label: "Special Order", category: "Private School - Special Order" }
    ]
  },
  {
    id: "smme",
    label: "School Management, Monitoring & Evaluation",
    description: "SMME Programs & Concerns",
    icon: BarChart3,
    color: "from-teal-500 to-teal-600",
    lightColor: "bg-teal-50",
    textColor: "text-teal-600",
    hasSubMenu: false,
    directCategory: "School Management, Monitoring & Evaluation"
  },
  {
    id: "planning",
    label: "Planning and Research",
    description: "Data, Plans & Research",
    icon: Users,
    color: "from-amber-500 to-amber-600",
    lightColor: "bg-amber-50",
    textColor: "text-amber-600",
    hasSubMenu: true,
    subItems: [
      { label: "Inquire", type: "inquire", category: "Planning and Research" },
      { label: "Submit Proposal", type: "proposal", category: "Planning and Research" },
      { label: "Request for TA", type: "ta", category: "Planning and Research" }
    ]
  },
  {
    id: "yfd",
    label: "Youth Formation Division (YFD)",
    description: "YFD Programs & Concerns",
    icon: Network,
    color: "from-emerald-500 to-emerald-600",
    lightColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    hasSubMenu: false,
    directCategory: "Youth Formation Division (YFD)"
  },
  {
    id: "social",
    label: "Social Mobilization & Networking",
    description: "Community Partnerships",
    icon: Network,
    color: "from-rose-500 to-rose-600",
    lightColor: "bg-rose-50",
    textColor: "text-rose-600",
    hasSubMenu: false,
    directCategory: "Social Mobilization and Networking"
  },
  {
    id: "hrd",
    label: "Human Resource Development",
    description: "HRD Programs & Training",
    icon: UserCog,
    color: "from-cyan-500 to-cyan-600",
    lightColor: "bg-cyan-50",
    textColor: "text-cyan-600",
    hasSubMenu: false,
    directCategory: "Human Resource Development"
  },
  {
    id: "drrm",
    label: "Disaster Risk Reduction and Management (DRRM)",
    description: "DRRM Programs & Concerns",
    icon: AlertCircle,
    color: "from-orange-500 to-orange-600",
    lightColor: "bg-orange-50",
    textColor: "text-orange-600",
    hasSubMenu: false,
    directCategory: "Disaster Risk Reduction and Management (DRRM)"
  },
  {
    id: "hnu",
    label: "Health and Nutrition Unit (HNU)",
    description: "Health & Nutrition Programs",
    icon: HeadphonesIcon,
    color: "from-green-500 to-green-600",
    lightColor: "bg-green-50",
    textColor: "text-green-600",
    hasSubMenu: false,
    directCategory: "Health and Nutrition Unit (HNU)"
  },
  {
    id: "sfc",
    label: "School Facilities and Constructions",
    description: "Infrastructure & Facilities",
    icon: Building2,
    color: "from-stone-500 to-stone-600",
    lightColor: "bg-stone-50",
    textColor: "text-stone-600",
    hasSubMenu: false,
    directCategory: "School Facilities and Constructions"
  },
  {
    id: "general",
    label: "General Technical Assistance",
    description: "General TA Requests",
    icon: HeadphonesIcon,
    color: "from-indigo-500 to-indigo-600",
    lightColor: "bg-indigo-50",
    textColor: "text-indigo-600",
    hasSubMenu: false,
    directCategory: "Technical Assistance (General)"
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotif, setUnreadNotif] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [requests, notifs] = await Promise.all([
        base44.entities.TARequest.list(),
        base44.entities.Notification.filter({ recipient_email: u?.email, is_read: false })
      ]);
      setStats({
        pending: requests.filter(r => r.request_status === "Pending").length,
        inProgress: requests.filter(r => ["Acknowledged","Scheduled","In Progress"].includes(r.request_status)).length,
        completed: requests.filter(r => r.request_status === "Completed").length
      });
      setUnreadNotif(notifs.length);
    } catch (e) {}
    setLoading(false);
  };

  const handleMenuClick = (item) => {
    if (!item.hasSubMenu) {
      navigate(createPageUrl(`TARequest?category=${encodeURIComponent(item.directCategory)}`));
    } else {
      setExpandedMenu(expandedMenu === item.id ? null : item.id);
    }
  };

  const getSubItemUrl = (sub) => {
    if (sub.type) {
      return createPageUrl(`TARequest?category=${encodeURIComponent(sub.category)}&type=${sub.type}`);
    }
    return createPageUrl(`TARequest?category=${encodeURIComponent(sub.category)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a14e9c5dae66299d9fa91f/103a871f5_Untitleddesign.png"
              alt="SDO Masbate City Logo"
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">SDO Masbate City</h1>
              <p className="text-xs text-slate-500">SGOD Technical Assistance Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Inbox")}>
              <Button variant="ghost" size="icon" className="relative">
                <MessageSquare className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <Link to={createPageUrl("Notifications")}>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadNotif > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadNotif > 9 ? "9+" : unreadNotif}
                  </span>
                )}
              </Button>
            </Link>
            <UserProfileMenu user={user} onUpdate={setUser} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">SGOD Technical Assistance Portal (TAP)</h2>
          <p className="text-slate-500 text-sm">Select a concern area to submit your request to SDO Masbate City</p>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "In Progress", value: stats.inProgress, icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" }
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Menu */}
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedMenu === item.id;
            return (
              <div key={item.id}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{item.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                    </div>
                    <div className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                      <ChevronRight className={`w-5 h-5 ${item.hasSubMenu ? "text-slate-300 group-hover:text-slate-500" : "text-slate-200 group-hover:text-slate-400"}`} />
                    </div>
                  </div>
                </button>

                {/* Sub-menu */}
                {item.hasSubMenu && isExpanded && (
                  <div className="ml-4 mt-2 space-y-2">
                    {item.subItems.map((sub) => (
                      <Link
                        key={`${sub.category}-${sub.label}`}
                        to={getSubItemUrl(sub)}
                        className="block bg-white/80 rounded-xl p-3 pl-5 border border-slate-100 hover:bg-white hover:shadow-sm transition-all duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${item.color}`} />
                          <span className="text-sm font-medium text-slate-700">{sub.label}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link to={createPageUrl("MyRequests")}>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all text-center">
              <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">My Requests</div>
              <div className="text-xs text-slate-400">Track your TAs</div>
            </div>
          </Link>
          <Link to={createPageUrl("Inbox")}>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all text-center">
              <MessageSquare className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">Inbox</div>
              <div className="text-xs text-slate-400">Messages & Updates</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
