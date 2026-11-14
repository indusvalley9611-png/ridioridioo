/**
 * NEXORA RIDE — Multi-language Localization Engine
 *
 * Supports English + Indian regional languages:
 * - English
 * - Hindi (हिंदी)
 * - Kannada (ಕನ್ನಡ)
 * - Tamil (தமிழ்)
 * - Telugu (తెలుగు)
 * - Malayalam (മലയാളം)
 * - Bengali (বাংলা)
 * - Punjabi (ਪੰਜਾਬੀ)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'kn'
  | 'ta'
  | 'te'
  | 'ml'
  | 'bn'
  | 'pa';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string; // e.g. "Kannada"
  nativeName: string; // e.g. "ಕನ್ನಡ"
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    app_name: 'NEXORA RIDE',
    welcome: 'Welcome to NEXORA RIDE',
    find_ride: 'Find a Ride',
    publish_ride: 'Publish a Ride',
    per_seat: 'per seat',
    instant_book: 'Instant Book',
    select_language: 'Select Language',
    you_charge: 'You Charge',
  },
  hi: {
    app_name: 'नेक्सोरा राइड',
    welcome: 'नेक्सोरा राइड में आपका स्वागत है',
    find_ride: 'राइड खोजें',
    publish_ride: 'राइड पोस्ट करें',
    per_seat: 'प्रति सीट',
    instant_book: 'तुरंत बुक करें',
    select_language: 'भाषा चुनें',
    you_charge: 'आपका किराया',
  },
  kn: {
    app_name: 'ನೆಕ್ಸೋರಾ ರೈಡ್',
    welcome: 'ನೆಕ್ಸೋರಾ ರೈಡ್‌ಗೆ ಸುಸ್ವಾಗತ',
    find_ride: 'ರೈಡ್ ಹುಡುಕಿ',
    publish_ride: 'ರೈಡ್ ಪ್ರಕಟಿಸಿ',
    per_seat: 'ಪ್ರತಿ ಸೀಟಿಗೆ',
    instant_book: 'ತ್ವರಿತ ಬುಕಿಂಗ್',
    select_language: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    you_charge: 'ನಿಮ್ಮ ಶುಲ್ಕ',
  },
  ta: {
    app_name: 'நெக்ஸோரா ரைட்',
    welcome: 'நெக்ஸோரா ரைடிற்கு வரவேற்கிறோம்',
    find_ride: 'பயணத்தை தேடுக',
    publish_ride: 'பயணத்தை பதிவிடுக',
    per_seat: 'ஒரு இருக்கைக்கு',
    instant_book: 'உடனடி முன்பதிவு',
    select_language: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    you_charge: 'உங்கள் கட்டணம்',
  },
  te: {
    app_name: 'నెక్సోరా రైడ్',
    welcome: 'నెక్సోరా రైడ్‌కి స్వాగతం',
    find_ride: 'రైడ్ శోధించండి',
    publish_ride: 'రైడ్ ప్రచురించండి',
    per_seat: 'ఒక్కో సీటుకు',
    instant_book: 'తక్షణ బుకింగ్',
    select_language: 'భాషను ఎంచుకోండి',
    you_charge: 'మీ ధర',
  },
  ml: {
    app_name: 'നെക്സോറ റൈഡ്',
    welcome: 'നെക്സോറ റൈഡിലേക്ക് സ്വാഗതം',
    find_ride: 'യാത്ര കണ്ടെത്തുക',
    publish_ride: 'റൈഡ് പോസ്റ്റ് ചെയ്യുക',
    per_seat: 'ഒരു സീറ്റിന്',
    instant_book: 'തൽക്ഷണം ബുക്ക് ചെയ്യുക',
    select_language: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    you_charge: 'നിങ്ങളുടെ നിരക്ക്',
  },
  bn: {
    app_name: 'নেক্সোরা রাইড',
    welcome: 'নেক্সোরা রাইডে আপনাকে স্বাগতম',
    find_ride: 'রাইড খুঁজুন',
    publish_ride: 'রাইড প্রকাশ করুন',
    per_seat: 'প্রতি আসন',
    instant_book: 'তাত্ক্ষণিক বুক করুন',
    select_language: 'ভাষা নির্বাচন করুন',
    you_charge: 'আপনার ভাড়া',
  },
  pa: {
    app_name: 'ਨੈਕਸੋਰਾ ਰਾਈਡ',
    welcome: 'ਨੈਕਸੋਰਾ ਰਾਈਡ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ',
    find_ride: 'ਰਾਈਡ ਲੱਭੋ',
    publish_ride: 'ਰਾਈਡ ਸ਼ੁਰੂ ਕਰੋ',
    per_seat: 'ਪ੍ਰਤੀ ਸੀਟ',
    instant_book: 'ਤੁਰੰਤ ਬੁੱਕ ਕਰੋ',
    select_language: 'ਭਾਸ਼ਾ ਚੁਣੋ',
    you_charge: 'ਤੁਹਾਡਾ ਕਿਰਾਇਆ',
  },
};

const STORAGE_KEY_LANG = '@nexora_selected_language';

class I18nService {
  private currentLanguage: SupportedLanguage = 'en';

  async getLanguage(): Promise<SupportedLanguage> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LANG);
      if (stored && (stored as SupportedLanguage) in TRANSLATIONS) {
        this.currentLanguage = stored as SupportedLanguage;
      }
    } catch {
      // Fallback
    }
    return this.currentLanguage;
  }

  async setLanguage(lang: SupportedLanguage): Promise<void> {
    this.currentLanguage = lang;
    await AsyncStorage.setItem(STORAGE_KEY_LANG, lang);
  }

  t(key: string): string {
    const dict = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }
}

export const i18n = new I18nService();
