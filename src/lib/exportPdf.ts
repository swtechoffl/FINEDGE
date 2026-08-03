type ToBlobOptions = NonNullable<Parameters<typeof import("html-to-image")["toBlob"]>[1]>;

// pdf-lib (and the PNG rasterization step) are only needed when a user
// actually clicks "Export PDF" — dynamically importing here keeps them out
// of the main bundle that loads for every page visit.
export async function exportNodesToPdf(nodes: HTMLElement[], filename: string, toBlobOptions?: ToBlobOptions) {
  const [{ toBlob }, { PDFDocument }] = await Promise.all([import("html-to-image"), import("pdf-lib")]);

  const backgroundColor =
    getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim() || "#ffffff";

  const pdfDoc = await PDFDocument.create();

  for (const node of nodes) {
    const pngBlob = await toBlob(node, { pixelRatio: 2, cacheBust: true, backgroundColor, ...toBlobOptions });
    if (!pngBlob) throw new Error("Could not rasterize a report page");
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const { width, height } = pngImage;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(pngImage, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  // pdf-lib's return type is generically `Uint8Array<ArrayBufferLike>` (could
  // in principle wrap a SharedArrayBuffer), but Blob's type wants a concrete
  // `ArrayBuffer`-backed view — Uint8Array.from() guarantees a fresh, plain copy.
  const pdfBlob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportNodeToPdf(node: HTMLElement, filename: string, toBlobOptions?: ToBlobOptions) {
  return exportNodesToPdf([node], filename, toBlobOptions);
}
