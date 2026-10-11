export const API_ENDPOINTS = {
  HEALTH: '/v1/health',
  WEATHER: '/v1/weather',
  FARMER: {
    PLAN: '/v1/farmer/plan',
    BOOK: '/v1/farmer/book',
    BOOKINGS: '/v1/farmer/bookings',
    STRAW_OUTLETS: '/v1/farmer/straw-outlets',
  },
  CITIZEN: {
    TODAY: '/v1/today',
    ASK: '/v1/ask',
  },
  MAP: {
    LAYERS: '/v1/map/layers',
  },
  REPORTS: {
    UPLOAD_URL: '/v1/reports/upload-url',
    SUBMIT: '/v1/reports',
    GET: '/v1/reports',
    CLASSIFY: '/v1/reports/classify',
    GET_BY_ID: (id: string) => `/v1/reports/${id}`,
  },
  SUBSCRIPTIONS: {
    CREATE: '/v1/subscriptions',
  },
  AUTH: {
    PROFILE: '/v1/auth/profile',
    GET_PROFILE: '/v1/profile',
  },
};
