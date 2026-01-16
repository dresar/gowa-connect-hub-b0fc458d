export const config = {
  port: Number(process.env.PORT) || 3004,
  backendDomain: process.env.BACKEND_DOMAIN || 'backend.ekacode.web.id',
  nodeEnv: process.env.NODE_ENV || 'development',
  gowaApiUrl: process.env.API_URL || 'https://gowa.ekacode.web.id',
};
