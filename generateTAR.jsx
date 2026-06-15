import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import jsPDF from "jspdf";

// Position/title lookup for known SDO personnel
const PERSONNEL_POSITIONS = {
  "samson.capinig001@deped.gov.ph": { name: "Samson G. Capinig", position: "School Division Superintendent" },
  "marcelino.ibanez01@deped.gov.ph": { name: "Marcelino E. Ibanez", position: "Assistant Schools Division Superintendent" },
  "gregorio.legal001@deped.gov.ph": { name: "Gregorio Legal", position: "Assistant Schools Division Superintendent" },
  "liz.liao001@deped.gov.ph": { name: "Liz R. Liao", position: "Education Program Supervisor" },
  "dinahdawn.serra@deped.gov.ph": { name: "Dinah Dawn Serra", position: "Education Program Supervisor" },
  "roseann.narido@deped.gov.ph": { name: "Rose Ann O. Narido", position: "Education Program Supervisor" },
  "jason.barrun@deped.gov.ph": { name: "Jason S. Barrun", position: "Education Program Supervisor" },
  "emyjoyce.vinas@deped.gov.ph": { name: "Atty. Remy Joyce Biñas", position: "Legal Officer" },
  "kenneth.lim@deped.gov.ph": { name: "Kenneth A. Lim", position: "Education Program Supervisor" },
  "gerardleomel.estoquia@deped.gov.ph": { name: "Gerard Leomel R. Estoquia", position: "Education Program Supervisor" },
  "ana.ferrer@deped.gov.ph": { name: "Ana Ferrer", position: "Education Program Supervisor" },
  "sandra.matados001@deped.gov.ph": { name: "Sandra Matados", position: "Education Program Supervisor" },
};

// Calibri isn't bundled in jsPDF — we'll use Helvetica (closest standard substitute)
// and apply formatting to match the spec as closely as possible.

function wrapText(doc, text, x, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text || "—", maxWidth);
  lines.forEach(line => {
    const pageHeight = doc.internal.pageSize.height;
    if (doc.lastAutoTable?.finalY > pageHeight - 30 || doc.internal.getCurrentPageInfo().pageNumber) {
      // basic overflow guard handled by addPage below
    }
    doc.text(line, x, doc.internal.getCurrentPageInfo().pageContext.currentY ?? 0);
    doc.internal.getCurrentPageInfo().pageContext.currentY =
      (doc.internal.getCurrentPageInfo().pageContext.currentY ?? 0) + lineHeight;
  });
}

export async function generateTAR(request) {
  // Fetch the TA provider's profile for name/position
  let providerProfileName = null;
  let providerProfilePosition = null;
  if (request.assigned_to_email) {
    try {
      const users = await base44.entities.User.filter({ email: request.assigned_to_email });
      if (users[0]) {
        providerProfileName = users[0].full_name || request.assigned_to_name;
        // Only use User profile position if not blank AND not already in PERSONNEL_POSITIONS map
        const mappedInfo = PERSONNEL_POSITIONS[request.assigned_to_email];
        providerProfilePosition = mappedInfo?.position || (users[0].position ? users[0].position : null);
      }
    } catch (e) {}
  }

  // Fetch messages for context
  let messages = [];
  if (request.conversation_id) {
    messages = await base44.entities.Message.filter(
      { conversation_id: request.conversation_id },
      "created_date"
    );
  }

  // Build a readable transcript for the AI
  const transcript = messages
    .map(m => `[${m.sender_name || m.sender_email}]: ${m.content}`)
    .join("\n");

  // Ask LLM to generate the TAR content
  const aiContent = await base44.integrations.Core.InvokeLLM({
    prompt: `You are generating a Technical Assistance Report (TAR) for the SDO Masbate City.

REQUEST DETAILS:
- Category: ${request.category}
- Concerns: ${request.concerns}
- Technical Assistance Needed: ${request.ta_needed}
- Implemented Actions: ${request.implemented_actions || "None stated"}
- Status of Issue: ${request.status_of_issue || "Not specified"}
- TA Provider: ${request.assigned_to_name || "SDO Personnel"}
- School: ${request.school || "Not specified"}
- Position of Requestor: ${request.position}

CONVERSATION/MESSAGES FROM TA SESSION:
${transcript || "No messages recorded."}

Generate the following sections for the TAR:

1. situational_analysis: A brief 2-4 sentence paragraph summarizing the concern/context based on the request details.

2. purposes: An array of exactly 3 strings, each being a specific purpose of the TA provision based on the concern.

3. planning_made: A 2-3 sentence summary of what planning was done before or during the TA (derive from conversation or request details).

4. action_taken: A 2-3 sentence summary of the actual actions taken during the TA provision (derive from conversation or request details).

5. result: A 2-3 sentence summary of the outcome/result of the TA (derive from conversation, status of issue, and implemented actions).`,
    response_json_schema: {
      type: "object",
      properties: {
        situational_analysis: { type: "string" },
        purposes: { type: "array", items: { type: "string" } },
        planning_made: { type: "string" },
        action_taken: { type: "string" },
        result: { type: "string" }
      }
    }
  });

  // ── Load logos ──
  const loadImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

  const [logoLeft, logoRight1, logoRight2] = await Promise.all([
    loadImage("https://www.depedmasbatecity.com/wp-content/uploads/2021/08/MASBATE-CITY-LOGO.png"),
    loadImage("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Seal_of_the_Department_of_Education_of_the_Philippines.svg/240px-Seal_of_the_Department_of_Education_of_the_Philippines.svg.png"),
    loadImage("https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Bagong_Pilipinas_logo.svg/240px-Bagong_Pilipinas_logo.svg.png"),
  ]);

  // ── Build PDF ──
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const marginL = 60;
  const marginR = 60;
  const contentW = pageW - marginL - marginR;
  const fontSize = 11;
  const lineH = 15;
  const paraLineH = 14;

  const HEADER_H = 86;
  const FOOTER_H = 28;

  // ── Draw header on current page ──
  const drawHeader = () => {
    const logoSize = 56;
    const hY = 14;

    if (logoLeft) doc.addImage(logoLeft, "PNG", marginL, hY, logoSize, logoSize);

    const cx = pageW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Republic of the Philippines", cx, hY + 9, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Department of Education", cx, hY + 21, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Region V", cx, hY + 31, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Schools Division Office of Masbate City", cx, hY + 43, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("masbate.city@deped.gov.ph  |  (056) 578-0774", cx, hY + 54, { align: "center" });
    doc.setTextColor(0, 0, 0);

    const rLogoSize = 26;
    if (logoRight1) doc.addImage(logoRight1, "PNG", pageW - marginR - rLogoSize * 2 - 5, hY + 12, rLogoSize, rLogoSize);
    if (logoRight2) doc.addImage(logoRight2, "PNG", pageW - marginR - rLogoSize, hY + 12, rLogoSize, rLogoSize);

    doc.setDrawColor(0, 70, 140);
    doc.setLineWidth(1.5);
    doc.line(marginL, hY + logoSize + 4, pageW - marginR, hY + logoSize + 4);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
  };

  // ── Draw footer on current page ──
  const drawFooter = (pageNum, totalPages) => {
    const fY = pageH - 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("SDO Masbate City – Technical Assistance Report (TAR)", marginL, fY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - marginR, fY, { align: "right" });
    doc.setTextColor(0, 0, 0);
    // Top footer line
    doc.setDrawColor(0, 70, 140);
    doc.setLineWidth(0.8);
    doc.line(marginL, fY - 8, pageW - marginR, fY - 8);
    doc.setDrawColor(180, 180, 180);
  };

  let y = HEADER_H + 14;

  const checkPage = (neededH = 30) => {
    if (y + neededH > pageH - FOOTER_H - 16) {
      doc.addPage();
      drawHeader();
      y = HEADER_H + 14;
    }
  };

  // Draw header on first page
  drawHeader();

  // ── Helper: justified paragraph ──
  const justifiedParagraph = (text, fontStyle = "normal", size = fontSize) => {
    doc.setFont("times", fontStyle);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || "—", contentW);
    lines.forEach((line, idx) => {
      checkPage(paraLineH);
      // Justify all lines except the last
      if (idx < lines.length - 1) {
        const words = line.trim().split(/\s+/);
        if (words.length > 1) {
          const totalWordW = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
          const gap = (contentW - totalWordW) / (words.length - 1);
          let xPos = marginL;
          words.forEach((word, wi) => {
            doc.text(word, xPos, y);
            xPos += doc.getTextWidth(word) + gap;
          });
        } else {
          doc.text(line, marginL, y);
        }
      } else {
        doc.text(line, marginL, y);
      }
      y += paraLineH;
    });
    y += 4;
  };

  // ── Helper: section heading ──
  const sectionHeading = (text) => {
    checkPage(22);
    doc.setFont("times", "bold");
    doc.setFontSize(fontSize);
    doc.text(text, marginL, y);
    y += lineH;
  };

  // ── TITLE ──
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("TECHNICAL ASSISTANCE REPORT (TAR)", pageW / 2, y, { align: "center" });
  y += lineH + 4;

  // 1. Situational Analysis
  sectionHeading("Situational Analysis/Context:");
  justifiedParagraph(aiContent.situational_analysis);

  // 2. Purpose of TA Provision
  sectionHeading("Purpose of TA Provision:");
  (aiContent.purposes || []).forEach((p, i) => {
    checkPage(paraLineH);
    justifiedParagraph(`${i + 1}. ${p}`);
  });
  y -= 2;

  // 3. What was Undertaken (table)
  sectionHeading("What was Undertaken:");

  const col1W = 110;
  const col2W = contentW - col1W;
  const rowPad = 6;
  const rowData = [
    { label: "Planning Made", value: aiContent.planning_made || "—" },
    { label: "Action Taken", value: aiContent.action_taken || "—" },
    { label: "Result", value: aiContent.result || "—" }
  ];

  rowData.forEach(row => {
    doc.setFont("times", "normal");
    doc.setFontSize(fontSize);
    const valueLines = doc.splitTextToSize(row.value, col2W - 10);
    const rowH = Math.max(rowPad * 2 + paraLineH, rowPad * 2 + valueLines.length * paraLineH);
    checkPage(rowH + 2);

    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(240, 244, 250);
    doc.rect(marginL, y, col1W, rowH, "FD");
    doc.setFillColor(255, 255, 255);
    doc.rect(marginL + col1W, y, col2W, rowH, "FD");

    doc.setFont("times", "bold");
    doc.setFontSize(fontSize);
    doc.text(row.label, marginL + 5, y + rowPad + paraLineH - 3);

    doc.setFont("times", "normal");
    doc.setFontSize(fontSize);
    valueLines.forEach((line, li) => {
      doc.text(line, marginL + col1W + 5, y + rowPad + li * paraLineH + paraLineH - 3);
    });

    y += rowH;
  });

  y += 16;

  // 4. TA Provider signature block (centered)
  checkPage(52);
  const personnelInfo = PERSONNEL_POSITIONS[request.assigned_to_email];
  const providerName = (personnelInfo?.name || providerProfileName || request.assigned_to_name || "TA Provider").toUpperCase();
  const providerPosition = personnelInfo?.position || providerProfilePosition || "SDO Masbate City";
  const taDate = request.accepted_at
    ? format(new Date(request.accepted_at), "MMMM d, yyyy")
    : (request.updated_date ? format(new Date(request.updated_date), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy"));

  doc.setFont("times", "bold");
  doc.setFontSize(fontSize);
  doc.text(`   ${providerName}`, pageW / 2, y, { align: "center" });
  y += paraLineH;

  doc.setFont("times", "normal");
  doc.setFontSize(fontSize);
  doc.text(`   ${providerPosition}`, pageW / 2, y, { align: "center" });
  y += paraLineH;

  doc.setFont("times", "italic");
  doc.setFontSize(fontSize - 0.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`   Date of TA Provision: ${taDate}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // ── Draw footers on all pages ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // ── Save ──
  doc.save(`TAR-${request.request_number || request.id}.pdf`);
}
