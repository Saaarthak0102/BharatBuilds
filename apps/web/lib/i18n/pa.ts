import { en } from './en';

// Simplified translation, falling back to English for missing keys in MVP
export const pa: typeof en = {
  ...en,
  common: {
    ...en.common,
    loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
    error: 'ਇੱਕ ਗਲਤੀ ਹੋਈ',
    retry: 'ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    sampleData: 'ਨਮੂਨਾ ਡੇਟਾ',
    bookSlot: 'ਸਲਾਟ ਬੁੱਕ ਕਰੋ',
    signOut: 'ਸਾਈਨ ਆਊਟ',
  },
  landing: {
    ...en.landing,
    heroTitle: 'ਖੇਤ ਤੋਂ ਦਿੱਲੀ ਤੱਕ',
    imAFarmer: 'ਮੈਂ ਇੱਕ ਕਿਸਾਨ ਹਾਂ',
    imACitizen: 'ਮੈਂ ਇੱਕ ਨਾਗਰਿਕ ਹਾਂ',
  },
  farmer: {
    ...en.farmer,
    myField: 'ਮੇਰਾ ਖੇਤ',
  }
};
