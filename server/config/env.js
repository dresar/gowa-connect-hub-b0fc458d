export const config = {
  port: Number(process.env.PORT) || 3001,
  backendDomain: process.env.BACKEND_DOMAIN || 'backend.ekacode.web.id',
  nodeEnv: process.env.NODE_ENV || 'development',
  gowaApiUrl: process.env.API_URL || 'http://192.168.18.50:3003',
};

