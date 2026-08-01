import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationEN from "./locales/en/translation.json";
import translationDE from "./locales/de/translation.json";

const resources = {
  en: { translation: translationEN },
  de: { translation: translationDE },
};

i18n
  .use(LanguageDetector) // Automatically detects the user's browser language
  .use(initReactI18next) // Passes the instance to react-i18next
  .init({
    resources,
    fallbackLng: "en", // Defaults to English if a translation is missing
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
  });

export default i18n;
