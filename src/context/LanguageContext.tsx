/**
 * NEXORA RIDE — Reactive Language Context
 *
 * Provides reactive language state across the entire React Native / Web app.
 * When the user selects a language, any component using `useLanguage()`
 * automatically re-renders with the newly selected language.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { i18n, SupportedLanguage, SUPPORTED_LANGUAGES, LanguageOption } from '@/services/i18nService';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key: string) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const stored = await i18n.getLanguage();
      if (isMounted) {
        setLangState(stored);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = async (newLang: SupportedLanguage) => {
    setLangState(newLang);
    await i18n.setLanguage(newLang);
  };

  const t = (key: string): string => {
    return i18n.t(key, language);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
