import { en } from './en';

// Simplified translation, falling back to English for missing keys in MVP
export const hi: typeof en = {
  ...en,
  common: {
    ...en.common,
    loading: 'लोड हो रहा है...',
    error: 'एक त्रुटि हुई',
    retry: 'पुनः प्रयास करें',
    sampleData: 'नमूना डेटा',
    bookSlot: 'स्लॉट बुक करें',
    signOut: 'साइन आउट',
  },
  landing: {
    ...en.landing,
    heroTitle: 'खेत से दिल्ली तक',
    imAFarmer: 'मैं एक किसान हूँ',
    imACitizen: 'मैं एक नागरिक हूँ',
  },
  farmer: {
    ...en.farmer,
    myField: 'मेरा खेत',
  }
};
