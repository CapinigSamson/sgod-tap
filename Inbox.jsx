import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Trash2, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import CreateGroupChatModal from "@/components/chat/CreateGroupChatModal";
import PullToRefresh from "@/components/PullToRefresh";

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const navigate = useNavigate();

  const canCreateGroup = user?.role === "admin" || user?.role === "approver" || user?.role === "assignee";

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const isAdmin = u?.role === "admin";
      const convs = isAdmin
        ? await base44.entities.Conversation.list("-last_message_at")
        : await base44.entities.Conversation.filter({ created_by: u?.email }, "-last_message_at");
      setConversations(convs);
    } catch (e) {}
    setLoading(false);
  };

  const clearAll = async () => {
    if (!window.confirm("Delete all conversations? This cannot be undone.")) return;
    setClearing(true);
    await Promise.all(conversations.map(c => base44.entities.Conversation.delete(c.id)));
    setConversations([]);
    setClearing(false);
  };

  const handleGroupCreated = (conv) => {
    setShowGroupModal(false);
    navigate(`/Chat?id=${conv.id}`);
  };

  const filtered = conversations.filter(c => {
    const matchSearch = !search ||
      c.subject?.toLowerCase().includes(search.toLowerCase()) ||
      c.request_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || (filterType === "group" ? c.is_group : !c.is_group);
    const matchDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const d = c.last_message_at ? new Date(c.last_message_at) : null;
      if (!d) return false;
      if (dateFrom && d < startOfDay(new Date(dateFrom))) return false;
      if (dateTo && d > endOfDay(new Date(dateTo))) return false;
      return true;
    })();
    return matchSearch && matchType && matchDate;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-slate-800 flex-1">Inbox</h1>
          <div className="flex items-center gap-2">
            {canCreateGroup && (
              <Button size="sm" onClick={() => setShowGroupModal(true)} className="rounded-xl gap-1 bg-indigo-600 hover:bg-indigo-700 text-xs">
                <Users className="w-3.5 h-3.5" /> Group
              </Button>
            )}
            {conversations.length > 0 && (
              <Button size="sm" variant="outline" onClick={clearAll} disabled={clearing} className="rounded-xl gap-1 border-rose-200 text-rose-500 hover:bg-rose-50">
                <Trash2 className="w-4 h-4" /> {clearing ? "Clearing..." : "Clear All"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={loadConversations}>
      <div className="max-w-2xl mx-auto px-4 py-5 flex-1">
        <div className="space-y-2 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by subject, request #, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="all">All Types</option>
              <option value="direct">Direct</option>
              <option value="group">Group</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {(filterType !== "all" || dateFrom || dateTo) && (
              <button
                onClick={() => { setFilterType("all"); setDateFrom(""); setDateTo(""); }}
                className="text-xs text-indigo-600 hover:underline px-1"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No conversations yet</p>
            <p className="text-slate-400 text-sm mt-1">Submit a TA request to start a conversation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(conv => (
              <Link key={conv.id} to={createPageUrl(`Chat?id=${conv.id}`)}>
                <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${conv.is_group ? "bg-gradient-to-br from-violet-400 to-violet-600" : "bg-gradient-to-br from-indigo-400 to-indigo-600"}`}>
                    {conv.is_group ? <Users className="w-5 h-5 text-white" /> : <MessageSquare className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">{conv.is_group ? "Group Chat" : conv.request_number}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {conv.last_message_at
                          ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm line-clamp-1 mt-0.5">{conv.subject}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{conv.last_message}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      </PullToRefresh>
      {showGroupModal && (
        <CreateGroupChatModal
          user={user}
          onClose={() => setShowGroupModal(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}
