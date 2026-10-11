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
    preferToSellStraw: 'क्या आप अपनी पराली बेचना पसंद करेंगे?', // TODO: Human review (Hindi)
    browseAllOutlets: 'सभी आउटलेट देखें', // TODO: Human review (Hindi)
    topRanked: 'शीर्ष 3 आउटलेट', // TODO: Human review (Hindi)
    recommended: 'अनुशंसित', // TODO: Human review (Hindi)
    pickupAvailable: 'पिकअप उपलब्ध', // TODO: Human review (Hindi)
    dropoffOnly: 'केवल ड्रॉप-ऑफ', // TODO: Human review (Hindi)
    pickupOnRequest: 'अनुरोध पर पिकअप', // TODO: Human review (Hindi)
  },
  citizen: {
    ...en.citizen,
    today: 'आज की हवा',
    feelingHeavy: 'सांस लेने में भारीपन?',
    troubleBreathing: 'सांस लेने में कठिनाई? तुरंत मदद लें',
    recentReports: 'मेरी हालिया रिपोर्ट',
    call112: '112 / एम्बुलेंस पर कॉल करें',
    burningStoppedToday: 'पिछले 24 घंटे में आग की घटनाएं', // TODO: Human review (Hindi)
    firesDetected24h: 'पिछले 24 घंटे में आग की घटनाएं', // TODO: Human review (Hindi)
    savedToday: 'दर्ज की गई रिपोर्ट', // TODO: Human review (Hindi)
    reportsSubmitted: 'दर्ज की गई रिपोर्ट', // TODO: Human review (Hindi)
    bestTimeOutside: 'बाहर जाने का सामान्य साफ़ समय (मौसमी पैटर्न)', // TODO: Human review (Hindi)
    // TODO: Human review (Hindi translations for today and report screens)
    selectArea: 'वार्ड / क्षेत्र चुनें',
    freshnessLabel: 'अपडेट किया गया {time}',
    cachedOfflineNotice: 'ऑफ़लाइन सहेजा गया परिणाम दिखाया जा रहा है',
    trend24h: '24-घंटे का पूर्वानुमान',
    healthExposureAdvice: 'स्वास्थ्य और जोखिम सलाह',
    back: 'वापस',
    stepPhoto: '1. फ़ोटो',
    stepConfirm: '2. पुष्टि करें',
    stepStatus: '3. स्थिति',
    takeOrUploadPhoto: 'फ़ोटो लें या अपलोड करें',
    cameraHint: 'JPEG, PNG, WebP (अधिकतम 5 MB)',
    changePhoto: 'फ़ोटो बदलें',
    fileSizeExceeded: 'फ़ाइल का आकार संपीड़न के बाद 5 MB से अधिक है। कृपया छोटी फ़ोटो चुनें।',
    detectingGps: 'GPS स्थान खोजा जा रहा है...',
    gpsDetected: 'GPS स्थान मिल गया',
    gpsFailed: 'GPS अनुपलब्ध है। कृपया नीचे वार्ड चुनें।',
    wardSelect: 'वार्ड / स्थान',
    continueToConfirm: 'अपलोड और समीक्षा',
    uploadingAndClassifying: 'फ़ोटो अपलोड और विश्लेषण हो रहा है...',
    uploadFailedRetry: 'अपलोड विफल रहा। कृपया पुन: प्रयास करें।',
    chooseCategory: 'घटना की श्रेणी चुनें',
    confidenceHigh: 'उच्च सटीकता',
    confidenceModerate: 'मध्यम सटीकता',
    confidenceLow: 'निश्चित नहीं, कृपया स्वयं चुनें',
    submitReportAction: 'रिपोर्ट दर्ज करें',
    submittingReport: 'रिपोर्ट दर्ज की जा रही है...',
    statusTimelineTitle: 'रिपोर्ट की स्थिति',
    statusReceived: 'प्राप्त हुई',
    statusRouted: 'भेजी गई',
    statusResolved: 'निपटारा हुआ',
    routingSimulatedNotice: 'रूटिंग सिम्युलेटेड है',
    awaitingReviewNotice: 'समीक्षा प्रतीक्षित है',
    viewOnMap: 'मानचित्र पर देखें',
    backToDashboard: 'डैशबोर्ड पर वापस जाएं',
    catCropBurning: 'पराली जलाना',
    catGarbageBurning: 'कचरा जलाना',
    catCrackerBurning: 'पटाखे',
    catConstructionDust: 'निर्माण धूल',
    similarReportsMerged: '{count} समान रिपोर्टें जोड़ी गईं', // TODO: Human review (Hindi)
    needsReviewBadge: 'समीक्षा आवश्यक', // TODO: Human review (Hindi)
    youBadge: 'आप', // TODO: Human review (Hindi)
  },
};

