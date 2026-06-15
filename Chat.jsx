import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, ExternalLink, Paperclip, FileText, Image, X, Phone, FolderOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import SharedFilesPanel from "@/components/chat/SharedFilesPanel";

export default function Chat() {
  const urlParams = new URLSearchParams(window.location.search);
  const convId = urlParams.get("id");

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Message.subscribe(event => {
      if (event.data?.conversation_id === convId) {
        if (event.type === "create") {
          setMessages(prev => [...prev, event.data]);
        }
      }
    });
    return () => unsub();
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [convs, msgs] = await Promise.all([
        base44.entities.Conversation.filter({ id: convId }),
        base44.entities.Message.filter({ conversation_id: convId }, "created_date")
      ]);
      setConversation(convs[0]);
      setMessages(msgs);
    } catch (e) {}
    setLoading(false);
  };

  const handleFileAttach = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFile(true);
    const uploaded = await Promise.all(files.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return { name: file.name, url: file_url, type: file.type };
    }));
    setAttachments(prev => [...prev, ...uploaded]);
    setUploadingFile(false);
    e.target.value = "";
  };

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    setSending(true);
    const isSDO = user?.role === "admin" || user?.role === "approver" || user?.role === "assignee";

    // Build content with attachments
    let content = input.trim();
    if (attachments.length > 0) {
      const fileLinks = attachments.map(a => `[📎 ${a.name}](${a.url})`).join("\n");
      content = content ? `${content}\n\n${fileLinks}` : fileLinks;
    }

    // Optimistic UI — clear input immediately
    const sentText = input.trim();
    setInput("");
    setAttachments([]);
    setSending(false);

    await base44.entities.Message.create({
      conversation_id: convId,
      sender_email: user?.email || "",
      sender_name: user?.full_name || "User",
      sender_role: isSDO ? "sdo" : "school",
      content,
      is_read: false
    });

    // Background: update conversation & send notifications (non-blocking)
    base44.entities.Conversation.update(convId, {
      last_message: sentText.slice(0, 100),
      last_message_at: new Date().toISOString()
    });

    const notifyEmail = isSDO ? conversation?.created_by : null;
    if (notifyEmail) {
      base44.entities.Notification.create({
        recipient_email: notifyEmail,
        title: "New Message",
        message: `SDO replied: ${sentText.slice(0, 80)}`,
        type: "new_message",
        reference_id: convId,
        is_read: false,
        link: createPageUrl(`Chat?id=${convId}`)
      });
    } else if (!isSDO) {
      base44.entities.User.filter({ role: "admin" }).then(admins => {
        admins.forEach(admin => {
          base44.entities.Notification.create({
            recipient_email: admin.email,
            title: "New Message from School",
            message: `${user?.full_name}: ${sentText.slice(0, 80)}`,
            type: "new_message",
            reference_id: convId,
            is_read: false,
            link: createPageUrl(`Chat?id=${convId}`)
          });
        });
      });
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isImage = (type) => type?.startsWith("image/");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Inbox")}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                {conversation?.is_group && <Users className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
                <h1 className="font-bold text-slate-800 text-sm line-clamp-1">{conversation?.subject || "Conversation"}</h1>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {conversation?.is_group
                  ? `${(conversation?.participants || []).length} members`
                  : conversation?.request_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFiles(true)}
              className="rounded-xl text-amber-600 hover:bg-amber-50"
              title="Shared Files"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
            {conversation?.request_id && (
              <Link to={createPageUrl(`RequestDetail?id=${conversation.request_id}`)}>
                <Button variant="ghost" size="sm" className="text-indigo-600 gap-1 text-xs">
                  <ExternalLink className="w-3 h-3" /> View Request
                </Button>
              </Link>
            )}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const phone = conversation?.contact_number || "";
                if (phone) window.location.href = `tel:${phone}`;
                else alert("No contact number available for this conversation.");
              }}
            >
              <Button variant="ghost" size="icon" className="rounded-xl text-emerald-600 hover:bg-emerald-50">
                <Phone className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No messages yet. Start the conversation.</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_email === user?.email;
            const isSDO = msg.sender_role === "sdo";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isMe
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
                    : isSDO
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100 text-slate-800 border border-emerald-200"
                    : "bg-white text-slate-800 border border-slate-200"
                }`}>
                  {!isMe && (
                    <p className={`text-xs font-semibold mb-1 ${isSDO ? "text-emerald-600" : "text-indigo-600"}`}>
                      {conversation?.is_group ? (msg.sender_name || msg.sender_email) : (isSDO ? "SDO Masbate City" : msg.sender_name)}
                    </p>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content?.split("\n").map((line, i) => {
                      const match = line.match(/\[📎 (.+?)\]\((.+?)\)/);
                      if (match) {
                        const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(match[2]);
                        return isImg ? (
                          <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="block mt-1">
                            <img src={match[2]} alt={match[1]} className="max-w-[200px] rounded-xl border border-white/20" />
                          </a>
                        ) : (
                          <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 mt-1 text-xs underline ${isMe ? "text-indigo-100" : "text-indigo-600"}`}>
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />{match[1]}
                          </a>
                        );
                      }
                      return <span key={i}>{line}{i < msg.content.split("\n").length - 1 ? "\n" : ""}</span>;
                    })}
                  </div>
                  <p className={`text-xs mt-1.5 ${isMe ? "text-indigo-200" : "text-slate-400"}`}>
                    {msg.created_date ? format(new Date(msg.created_date), "h:mm a · MMM d") : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1 text-xs text-slate-600 max-w-[180px]">
                  {isImage(a.type) ? <Image className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" /> : <FileText className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />}
                  <span className="truncate">{a.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="flex-shrink-0 hover:text-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={handleFileAttach} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current.click()}
              disabled={uploadingFile}
              className="rounded-xl h-10 w-10 flex-shrink-0 text-slate-400 hover:text-indigo-600"
            >
              {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message... (Enter to send)"
              rows={1}
              className="flex-1 rounded-xl border-slate-200 resize-none text-sm"
            />
            <Button
              onClick={sendMessage}
              disabled={sending || (!input.trim() && attachments.length === 0)}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-10 w-10 p-0 flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {showFiles && (
        <SharedFilesPanel
          conversationId={convId}
          user={user}
          onClose={() => setShowFiles(false)}
        />
      )}
    </div>
  );
}
