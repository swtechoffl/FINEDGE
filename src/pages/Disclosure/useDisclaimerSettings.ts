import { useEffect, useState } from "react";
import { ANALYST, CONTACT, CLOSING_NOTE, DISCLAIMER_PARAGRAPHS } from "./disclaimerContent";

// Editable overrides for the disclosure/disclaimer content — shared by the
// standalone Disclosure page and every report's disclaimer page (Premarket,
// RAMKI Premarket, RAMKI Post Market) via one localStorage key, so an edit
// made from any of them shows up everywhere the disclaimer is rendered.
const STORAGE_KEY = "stoqtrade-disclaimer-settings";

export interface DisclaimerSettings {
  analystName: string;
  registration: string;
  regLine: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  closingNote: string;
  paragraphs: string[];
}

function defaults(): DisclaimerSettings {
  return {
    analystName: ANALYST.name,
    registration: ANALYST.registration,
    regLine: ANALYST.regLine,
    title: ANALYST.title,
    email: CONTACT.email,
    phone: CONTACT.phone,
    address: CONTACT.address,
    closingNote: CLOSING_NOTE,
    paragraphs: [...DISCLAIMER_PARAGRAPHS],
  };
}

function readInitial(): DisclaimerSettings {
  const base = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      paragraphs: Array.isArray(parsed.paragraphs) && parsed.paragraphs.length > 0 ? parsed.paragraphs : base.paragraphs,
    };
  } catch {
    return base;
  }
}

export function useDisclaimerSettings() {
  const [settings, setSettings] = useState<DisclaimerSettings>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage unavailable (private browsing etc.) — edits just won't persist
    }
  }, [settings]);

  function update<K extends keyof DisclaimerSettings>(key: K, value: DisclaimerSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function updateParagraph(index: number, text: string) {
    setSettings((s) => ({ ...s, paragraphs: s.paragraphs.map((p, i) => (i === index ? text : p)) }));
  }

  function addParagraph() {
    setSettings((s) => ({ ...s, paragraphs: [...s.paragraphs, ""] }));
  }

  function removeParagraph(index: number) {
    setSettings((s) => ({ ...s, paragraphs: s.paragraphs.filter((_, i) => i !== index) }));
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // same as above
    }
    setSettings(defaults());
  }

  return { settings, update, updateParagraph, addParagraph, removeParagraph, reset };
}
