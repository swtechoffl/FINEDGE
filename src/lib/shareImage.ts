// html-to-image is only needed once a user actually generates a poster/share
// image — dynamically importing keeps it out of the main bundle.
export async function nodeToImageFile(node: HTMLElement, filename: string, pixelRatio = 3): Promise<File | null> {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, { pixelRatio, cacheBust: true });
  if (!blob) return null;
  return new File([blob], filename, { type: "image/png" });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareImageFile(
  file: File,
  shareData: { title?: string; text?: string },
): Promise<"shared" | "downloaded" | "cancelled"> {
  const data = { files: [file], ...shareData };
  if (navigator.canShare && navigator.canShare(data)) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "cancelled";
    }
  }
  downloadFile(file);
  return "downloaded";
}
