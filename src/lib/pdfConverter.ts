/** Convert a rendered report image into a Word-readable RTF document. */
export function pngDataUrlToRtf(dataUrl: string, title: string): Blob {
  const base64 = dataUrl.split(",", 2)[1] || "";
  const bytes = atob(base64);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) hex += bytes.charCodeAt(i).toString(16).padStart(2, "0");

  // 865 CSS px at 96 DPI, represented in twips for Word.
  const widthTwips = 12975;
  const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\viewkind4\\uc1\\pard\\qc\\f0\\fs20 ${title.replace(/[{}\\]/g, "")}\\par\\pard\\qc\\pict\\pngblip\\picwgoal${widthTwips}\\pichgoal0 ${hex}}`;
  return new Blob([rtf], { type: "application/rtf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
