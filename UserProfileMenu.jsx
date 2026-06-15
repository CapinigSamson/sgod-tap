import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { User, Camera, X, Loader2, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserProfileMenu({ user, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    position: user?.position || "",
    school: user?.school || "",
    contact_number: user?.contact_number || "",
    photo_url: user?.photo_url || "",
  });

  // Re-sync form when sheet opens so it always reflects current saved data
  const handleOpenChange = (val) => {
    if (val) {
      setForm({
        position: user?.position || "",
        school: user?.school || "",
        contact_number: user?.contact_number || "",
        photo_url: user?.photo_url || "",
      });
    }
    setOpen(val);
  };
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, photo_url: file_url }));
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    if (onUpdate) onUpdate({ ...user, ...form });
    setSaving(false);
    setOpen(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.auth.updateMe({ deleted: true });
      base44.auth.logout();
    } catch (e) {
      setDeleting(false);
    }
  };

  const photoSrc = form.photo_url || user?.photo_url;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-200 hover:border-indigo-400 transition-all flex-shrink-0 bg-indigo-100 flex items-center justify-center">
          {photoSrc ? (
            <img src={photoSrc} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-indigo-500" />
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-sm p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <SheetTitle className="text-slate-800">My Profile</SheetTitle>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5 overflow-y-auto h-full pb-24">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 bg-indigo-50 flex items-center justify-center">
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                ) : photoSrc ? (
                  <img src={photoSrc} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-indigo-300" />
                )}
              </div>
              <button
                onClick={() => fileRef.current.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">{user?.full_name || "—"}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Email Address</Label>
              <Input value={user?.email || ""} disabled className="rounded-xl bg-slate-50 text-slate-400 border-slate-200" />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Position / Title</Label>
              <Input
                placeholder="e.g. Teacher I, Principal"
                value={form.position}
                onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                className="rounded-xl border-slate-200"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">School / Office</Label>
              <Input
                placeholder="e.g. Masbate City National High School"
                value={form.school}
                onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                className="rounded-xl border-slate-200"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Contact Number</Label>
              <Input
                placeholder="e.g. 09XX XXX XXXX"
                value={form.contact_number}
                onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))}
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => base44.auth.logout()}
              className="w-full rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </Button>
          </div>
        </div>
      </SheetContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This will remove your profile, all your requests, and conversations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
