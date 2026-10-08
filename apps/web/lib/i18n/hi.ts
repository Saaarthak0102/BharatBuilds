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
    viewAll: 'सभी देखें',
    cancel: 'रद्द करें',
    actions: 'कार्रवाई',
  },
  landing: {
    ...en.landing,
    heroTitle: 'खेत से दिल्ली तक',
    imAFarmer: 'मैं एक किसान हूँ',
    imACitizen: 'मैं एक नागरिक हूँ',
  },
  auth: {
    ...en.auth,
  },
  farmer: {
    ...en.farmer,
    myField: 'मेरा खेत',
    bestDay: 'खेत साफ करने का सबसे अच्छा दिन',
    earningsSoFar: 'अब तक की कमाई',
    burningAvoided: 'बची पराली/जमीन',
    environmentSaved: 'पर्यावरण बचत',
    recentBookings: 'हाल की बुकिंग',
  },
  citizen: {
    ...en.citizen,
    today: 'आज की हवा',
    feelingHeavy: 'सांस लेने में भारीपन?',
    troubleBreathing: 'सांस लेने में कठिनाई? तुरंत मदद लें',
    recentReports: 'मेरी हालिया रिपोर्ट',
    call112: '112 / एम्बुलेंस पर कॉल करें',
  },
};
