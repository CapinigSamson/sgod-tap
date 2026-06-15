import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, User, Briefcase, Tag } from "lucide-react";

export default function ConfirmSubmitDialog({ open, form, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="rounded-2xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-slate-800">Confirm Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Row icon={User} label="Name" value={form.name} />
          <Row icon={Briefcase} label="Position" value={form.position} />
          <Row icon={Tag} label="Category" value={form.category} />
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Concern</p>
            <p className="text-sm text-slate-700 line-clamp-3">{form.concerns}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
            Edit
          </Button>
          <Button onClick={onConfirm} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-1">
            <CheckCircle className="w-4 h-4" /> Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value || "—"}</p>
      </div>
    </div>
  );
}
