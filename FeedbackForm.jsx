import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function FeedbackForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get("id");
  const token = urlParams.get("token"); // base64-encoded requester email for basic verification

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [wasResolved, setWasResolved] = useState(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (!requestId) { setLoading(false); return; }
    Promise.all([
      base44.entities.TARequest.filter({ id: requestId }),
      base44.entities.Feedback.filter({ request_id: requestId })
    ]).then(([reqs, existing]) => {
      setRequest(reqs[0] || null);
      if (existing.length > 0) setAlreadySubmitted(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [requestId]);

  const handleSubmit = async () => {
    if (!rating || wasResolved === null) return;
    setSubmitting(true);
    await base44.entities.Feedback.create({
      request_id: requestId,
      request_number: request?.request_number || "",
      requester_email: request?.created_by || "",
      requester_name: request?.name || "",
      school: request?.school || "",
      rating,
      was_resolved: wasResolved,
      comments: comments.trim(),
      submitted_at: new Date().toISOString()
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!requestId || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center text-slate-500">
          <p className="font-medium">Invalid or expired feedback link.</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h2>
          <p className="text-slate-500 text-sm">
            {alreadySubmitted && !submitted
              ? "You've already submitted feedback for this request."
              : "Your feedback has been received. We appreciate you helping us improve our services."}
          </p>
        </div>
      </div>
    );
  }

  const starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Star className="w-7 h-7 text-indigo-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Service Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">
            SDO Masbate City — Technical Assistance Portal
          </p>
          <div className="mt-3 px-3 py-1.5 bg-slate-50 rounded-xl inline-block">
            <p className="text-xs text-slate-500 font-mono">{request.request_number}</p>
            <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">{request.concerns}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Star Rating */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">How satisfied were you with the service provided?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      n <= (hovered || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p className="text-center text-sm font-medium text-amber-600 mt-2">
                {starLabels[hovered || rating]}
              </p>
            )}
          </div>

          {/* Resolved? */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Was your concern fully resolved?</p>
            <div className="flex gap-3">
              {[{ label: "Yes, fully resolved", value: true }, { label: "Not fully resolved", value: false }].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setWasResolved(opt.value)}
                  className={`flex-1 text-sm px-4 py-2.5 rounded-xl border-2 font-medium transition-all ${
                    wasResolved === opt.value
                      ? opt.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Additional comments <span className="text-slate-400 font-normal">(optional)</span></p>
            <Textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Share any suggestions or details about your experience..."
              className="rounded-xl border-slate-200 text-sm resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!rating || wasResolved === null || submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11 font-semibold"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
}
