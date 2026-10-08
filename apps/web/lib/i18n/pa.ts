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
    viewAll: 'ਸਭ ਦੇਖੋ',
    cancel: 'ਰੱਦ ਕਰੋ',
    actions: 'ਕਾਰਵਾਈਆਂ',
  },
  landing: {
    ...en.landing,
    heroTitle: 'ਖੇਤ ਤੋਂ ਦਿੱਲੀ ਤੱਕ',
    imAFarmer: 'ਮੈਂ ਇੱਕ ਕਿਸਾਨ ਹਾਂ',
    imACitizen: 'ਮੈਂ ਇੱਕ ਨਾਗਰਿਕ ਹਾਂ',
  },
  auth: {
    ...en.auth,
  },
  farmer: {
    ...en.farmer,
    myField: 'ਮੇਰਾ ਖੇਤ',
    bestDay: 'ਖੇਤ ਸਾਫ਼ ਕਰਨ ਦਾ ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ',
    earningsSoFar: 'ਹੁਣ ਤੱਕ ਦੀ ਕਮਾਈ',
    burningAvoided: 'ਅੱਗ ਲਾਉਣ ਤੋਂ ਬਚਾਈ ਗਈ ਜ਼ਮੀਨ',
    environmentSaved: 'ਵਾਤਾਵਰਣ ਦੀ ਬਚਤ',
    recentBookings: 'ਹਾਲੀਆ ਬੁਕਿੰਗਾਂ',
  },
  citizen: {
    ...en.citizen,
    today: 'ਅੱਜ ਦੀ ਹਵਾ',
    feelingHeavy: 'ਸਾਹ ਲੈਣ ਵਿੱਚ ਭਾਰੀਪਣ?',
    troubleBreathing: 'ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼? ਨੇੜਿਓਂ ਮਦਦ ਲਵੋ',
    recentReports: 'ਮੇਰੀਆਂ ਹਾਲੀਆ ਰਿਪੋਰਟਾਂ',
    call112: '112 / ਐਂਬੂਲੈਂਸ ਨੂੰ ਕਾਲ ਕਰੋ',
  },
};
