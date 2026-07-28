import { useEffect, useState } from "react";

const NAME_KEY = "stoqtrade-report-branding-name";
const LOGO_KEY = "stoqtrade-report-branding-logo";

export interface ReportBranding {
  name: string;
  logoDataUrl: string | null;
}

function readInitial(): ReportBranding {
  try {
    return {
      name: localStorage.getItem(NAME_KEY) || "",
      logoDataUrl: localStorage.getItem(LOGO_KEY),
    };
  } catch {
    return { name: "", logoDataUrl: null };
  }
}

export function useReportBranding() {
  const [branding, setBranding] = useState<ReportBranding>(readInitial);

  useEffect(() => {
    try {
      if (branding.name) localStorage.setItem(NAME_KEY, branding.name);
      else localStorage.removeItem(NAME_KEY);
    } catch {
      // localStorage unavailable (private browsing etc.) — branding just won't persist
    }
  }, [branding.name]);

  useEffect(() => {
    try {
      if (branding.logoDataUrl) localStorage.setItem(LOGO_KEY, branding.logoDataUrl);
      else localStorage.removeItem(LOGO_KEY);
    } catch {
      // same as above
    }
  }, [branding.logoDataUrl]);

  function setName(name: string) {
    setBranding((b) => ({ ...b, name }));
  }

  function setLogoDataUrl(logoDataUrl: string | null) {
    setBranding((b) => ({ ...b, logoDataUrl }));
  }

  function clear() {
    setBranding({ name: "", logoDataUrl: null });
  }

  return { branding, setName, setLogoDataUrl, clear };
}
