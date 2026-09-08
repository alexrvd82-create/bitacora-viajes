import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGES, RTL_LANGUAGES, LOCALE_MAP, getTranslation } from "./translations.js";

const STORAGE_KEY = "travel-maps-lang";
const SUPPORTED_CODES = LANGUAGES.map(l => l.code);

function detectInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_CODES.includes(stored)) return stored;
  } catch (e) { /* localStorage unavailable */ }
  const browserLang = (navigator.language || "en").slice(0, 2).toLowerCase();
  return SUPPORTED_CODES.includes(browserLang) ? browserLang : "en";
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  function setLang(code) {
    if (SUPPORTED_CODES.includes(code)) setLangState(code);
  }

  const value = useMemo(() => ({
    lang,
    setLang,
    locale: LOCALE_MAP[lang] || "en-US",
    isRTL: RTL_LANGUAGES.includes(lang),
    t: (key) => getTranslation(lang, key),
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

export { LANGUAGES };
