import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText, Download, Loader2, FolderOpen, Trash2, Image } from "lucide-react";
import { format } from "date-fns";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SharedFilesPanel({ conversationId, user, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, [conversationId]);

  const loadFiles = async () => {
    setLoading(true);
    const result = await base44.entities.SharedFile.filter({ conversation_id: conversationId }, "-created_date");
    setFiles(result);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setUploading(true);
    await Promise.all(selectedFiles.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SharedFile.create({
        conversation_id: conversationId,
        file_name: file.name,
        file_url,
        file_type: file.type,
        file_size: file.size,
        uploaded_by_email: user?.email || "",
        uploaded_by_name: user?.full_name || "User"
      });
    }));
    e.target.value = "";
    setUploading(false);
    loadFiles();
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Remove this file from the shared folder?")) return;
    await base44.entities.SharedFile.delete(fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const isImage = (type) => type?.startsWith("image/");
  const canDelete = (file) => user?.role === "admin" || file.uploaded_by_email === user?.email;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Shared Files</h2>
              <p className="text-xs text-slate-400">{files.length} file{files.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload button */}
        <div className="px-5 py-3 border-b border-slate-100">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className="w-full bg-amber-500 hover:bg-amber-600 rounded-xl gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No files yet. Upload something to share.</p>
            </div>
          ) : (
            files.map(file => (
              <div key={file.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 group">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  {isImage(file.file_type)
                    ? <Image className="w-4 h-4 text-indigo-500" />
                    : <FileText className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.file_name}</p>
                  <p className="text-xs text-slate-400">
                    {file.uploaded_by_name} · {formatBytes(file.file_size)}
                    {file.created_date ? ` · ${format(new Date(file.created_date), "MMM d, yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" download={file.file_name}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  {canDelete(file) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
