import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Users, Loader2 } from "lucide-react";

export default function CreateGroupChatModal({ user, onClose, onCreated }) {
  const [groupName, setGroupName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [members, setMembers] = useState([user?.email || ""]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email address.");
      return;
    }
    if (members.includes(email)) {
      setError("Already added.");
      return;
    }
    setMembers(prev => [...prev, email]);
    setEmailInput("");
    setError("");
  };

  const removeEmail = (email) => {
    if (email === user?.email) return; // can't remove yourself
    setMembers(prev => prev.filter(e => e !== email));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { setError("Please enter a group name."); return; }
    if (members.length < 2) { setError("Add at least one other member."); return; }
    setCreating(true);
    const conv = await base44.entities.Conversation.create({
      subject: groupName.trim(),
      group_name: groupName.trim(),
      is_group: true,
      participants: members,
      created_by_email: user?.email,
      last_message: "Group chat created",
      last_message_at: new Date().toISOString()
    });
    // Send system message
    await base44.entities.Message.create({
      conversation_id: conv.id,
      sender_email: user?.email,
      sender_name: user?.full_name || "User",
      sender_role: "sdo",
      content: `📣 Group chat "${groupName.trim()}" created by ${user?.full_name || user?.email}. Members: ${members.join(", ")}`,
      is_read: false
    });
    // Notify all members except creator
    members.filter(e => e !== user?.email).forEach(email => {
      base44.entities.Notification.create({
        recipient_email: email,
        title: "Added to Group Chat",
        message: `${user?.full_name || user?.email} added you to: ${groupName.trim()}`,
        type: "new_message",
        reference_id: conv.id,
        is_read: false,
        link: `/Chat?id=${conv.id}`
      });
    });
    setCreating(false);
    onCreated(conv);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-bold text-slate-800 text-lg">New Group Chat</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Group Name</label>
            <Input
              placeholder="e.g. SBM Coordination Team"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Add Members by Email</label>
            <div className="flex gap-2">
              <Input
                placeholder="member@deped.gov.ph"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addEmail()}
                className="rounded-xl flex-1"
              />
              <Button onClick={addEmail} variant="outline" size="icon" className="rounded-xl flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Members ({members.length})</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {members.map(email => (
                <div key={email} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-700 truncate">{email}</span>
                  {email === user?.email ? (
                    <span className="text-xs text-indigo-500 font-medium ml-2">You</span>
                  ) : (
                    <button onClick={() => removeEmail(email)} className="text-slate-400 hover:text-rose-500 ml-2 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {creating ? "Creating..." : "Create Group Chat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
