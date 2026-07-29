import { useRef, useState } from "react";
import { UserCog, Upload, Crop, Trash2, X } from "lucide-react";
import type { ReportBranding } from "./useReportBranding";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LogoCropper } from "./LogoCropper";
import { cn } from "../../lib/utils";

// Raw upload ceiling before cropping — generous since the cropper always
// re-encodes down to a small fixed-size PNG/JPEG before it's ever stored.
const MAX_UPLOAD_BYTES = 8_000_000;

export function ReportBrandingEditor({
  branding,
  setName,
  setLogoDataUrl,
  clear,
}: {
  branding: ReportBranding;
  setName: (name: string) => void;
  setLogoDataUrl: (dataUrl: string | null) => void;
  clear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(branding.name);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropObjectUrlRef = useRef<string | null>(null);

  function openEditor() {
    setDraftName(branding.name);
    setError(null);
    setOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Image is too large — please use a file under 8MB.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    cropObjectUrlRef.current = url;
    setCropSrc(url);
  }

  function openReCrop() {
    if (!branding.logoDataUrl) return;
    setError(null);
    setCropSrc(branding.logoDataUrl);
  }

  function closeCropper() {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropSrc(null);
  }

  function handleCropConfirm(dataUrl: string) {
    setLogoDataUrl(dataUrl);
    closeCropper();
  }

  function handleSave() {
    setName(draftName.trim());
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={openEditor}>
        <UserCog size={14} />
        <span className="hidden sm:inline">
          {branding.name || branding.logoDataUrl ? "Edit Branding" : "Add Name & Logo"}
        </span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-border bg-surface p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Report Branding</span>
              <button
                onClick={() => setOpen(false)}
                className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Your name / firm</label>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Sharewealth Securities"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Logo</label>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-app",
                    )}
                  >
                    {branding.logoDataUrl ? (
                      <img src={branding.logoDataUrl} alt="Logo preview" className="h-full w-full object-cover" />
                    ) : (
                      <UserCog size={18} className="text-subtle-foreground" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={13} /> Upload
                  </Button>
                  {branding.logoDataUrl && (
                    <>
                      <Button variant="ghost" size="sm" onClick={openReCrop} title="Adjust crop">
                        <Crop size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setLogoDataUrl(null)}>
                        <Trash2 size={13} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {error && <p className="text-xs text-bearish">{error}</p>}

              <div className="mt-1 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    clear();
                    setDraftName("");
                    setOpen(false);
                  }}
                  className="focus-ring text-xs font-medium text-subtle-foreground hover:text-bearish"
                >
                  Remove all
                </button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {cropSrc && <LogoCropper imageSrc={cropSrc} onCancel={closeCropper} onConfirm={handleCropConfirm} />}
    </div>
  );
}
