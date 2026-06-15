import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Shield, UserCheck, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isAdminUser } from "@/components/assignment/personnelList";

const ROLES = [
  { value: "requester", label: "Requester", description: "Submit requests, view own requests", color: "bg-slate-100 text-slate-600", icon: User },
  { value: "approver", label: "Approver", description: "Update request status, approve requests, view all", color: "bg-blue-100 text-blue-700", icon: UserCheck },
  { value: "assignee", label: "Assignee", description: "Handle assigned tasks, accept/reassign, view all", color: "bg-violet-100 text-violet-700", icon: Briefcase },
  { value: "admin", label: "Admin", description: "Full access: assign, approve, manage users", color: "bg-rose-100 text-rose-700", icon: Shield },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [u, allUsers] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list()
    ]);
    setCurrentUser(u);
    setUsers(allUsers);
    setLoading(false);
  };

  const updateRole = async (userId, newRole) => {
    setSaving(userId);
    await base44.entities.User.update(userId, { role: newRole });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdminUser(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Access Restricted</p>
          <p className="text-slate-400 text-sm mt-1">Only admins can manage user roles.</p>
          <Link to={createPageUrl("Home")}><Button className="mt-4 rounded-xl">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-slate-800">User Management</h1>
            <p className="text-xs text-slate-400">Assign roles to control access</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Role Legend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Role Permissions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map(role => {
              const Icon = role.icon;
              return (
                <div key={role.value} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50">
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${role.color}`}>
                    <Icon className="w-3 h-3" />
                    {role.label}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2">
          {users.map(u => {
            const roleInfo = ROLES.find(r => r.value === (u.role || "requester")) || ROLES[0];
            const Icon = roleInfo.icon;
            const isSelf = u.id === currentUser?.id;
            return (
              <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSelf ? (
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${roleInfo.color}`}>
                      <Icon className="w-3 h-3" />
                      {roleInfo.label}
                    </span>
                  ) : (
                    <Select
                      value={u.role || "requester"}
                      onValueChange={(val) => updateRole(u.id, val)}
                      disabled={saving === u.id}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 text-xs h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            <span className="text-xs font-medium">{r.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {saving === u.id && (
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
