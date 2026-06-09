import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LangCode = "en" | "ar";

export interface Language {
  code: LangCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English",  nativeLabel: "English",  flag: "🇺🇸" },
  { code: "ar", label: "Arabic",   nativeLabel: "العربية",  flag: "🇸🇦" },
];

interface LanguageContextType {
  lang: LangCode;
  language: Language;
  setLang: (code: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  language: LANGUAGES[0],
  setLang: () => {},
});

const STORAGE_KEY = "mora_language_v1";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "en" || val === "ar") {
        setLangState(val);
      }
    });
  }, []);

  const setLang = (code: LangCode) => {
    setLangState(code);
    AsyncStorage.setItem(STORAGE_KEY, code);
  };

  const language = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, language, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
