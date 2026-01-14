import axios from 'axios';

const getConfig = () => {
  const baseURL = localStorage.getItem('gowa_base_url') || 'https://gowa.ekacode.web.id';
  const username = localStorage.getItem('gowa_username') || 'admin';
  const password = localStorage.getItem('gowa_password') || 'admin';
  const deviceId = localStorage.getItem('gowa_device_id') || '';
  
  return { baseURL, username, password, deviceId };
};

export const api = axios.create();

api.interceptors.request.use((config) => {
  const { baseURL, username, password, deviceId } = getConfig();
  config.baseURL = baseURL;
  config.auth = { username, password };
  if (deviceId && !config.url?.includes('/devices') && !config.url?.includes('/app/status')) {
    config.headers['X-Device-Id'] = deviceId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gowa_authenticated');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// App & Device
export const getAppStatus = () => api.get('/app/status');
export const getDevices = () => api.get('/devices');
export const getDeviceStatus = (id: string) => api.get(`/devices/${id}/status`);
export const getDeviceInfo = (id: string) => api.get(`/devices/${id}/info`);
export const createDevice = (customId?: string) => api.post('/devices', customId ? { id: customId } : {});
export const deleteDevice = (id: string) => api.delete(`/devices/${id}`);
export const getDeviceQR = (id: string) => api.get(`/devices/${id}/login`);
export const loginWithCode = (id: string, phone: string) => api.post(`/devices/${id}/login/code`, { phone });
export const reconnectDevice = (id: string) => api.post(`/devices/${id}/reconnect`);
export const logoutDevice = (id: string) => api.post(`/devices/${id}/logout`);

// Chats
export const getChats = () => api.get('/chats');
export const getChatMessages = (jid: string) => api.get(`/chat/${jid}/messages`);
export const pinChat = (jid: string, pin: boolean) => api.post(`/chat/${jid}/pin`, { pin });
export const markMessageRead = (id: string) => api.post(`/message/${id}/read`);
export const deleteMessage = (id: string) => api.delete(`/message/${id}`);
export const revokeMessage = (id: string) => api.post(`/message/${id}/revoke`);
export const downloadMedia = (id: string) => api.get(`/message/${id}/media`, { responseType: 'blob' });

// Send Messages
export const sendText = (phone: string, message: string) => api.post('/send/text', { phone, message });
export const sendImage = (data: FormData) => api.post('/send/image', data);
export const sendVideo = (data: FormData) => api.post('/send/video', data);
export const sendAudio = (data: FormData) => api.post('/send/audio', data);
export const sendDocument = (data: FormData) => api.post('/send/document', data);
export const sendPoll = (phone: string, question: string, options: string[], maxAnswers: number) => 
  api.post('/send/poll', { phone, question, options, maxAnswers });
export const sendLocation = (phone: string, lat: number, long: number) => 
  api.post('/send/location', { phone, latitude: lat, longitude: long });
export const sendContact = (phone: string, name: string, contactPhone: string) => 
  api.post('/send/contact', { phone, contact: { name, phone: contactPhone } });
export const sendSticker = (data: FormData) => api.post('/send/sticker', data);

// Groups
export const getMyGroups = () => api.get('/user/my/groups');
export const createGroup = (name: string, participants: string[]) => 
  api.post('/group/create', { name, participants });
export const getGroupInfo = (jid: string) => api.get(`/group/${jid}/info`);
export const updateGroupName = (jid: string, name: string) => api.put(`/group/${jid}/name`, { name });
export const updateGroupPhoto = (jid: string, data: FormData) => api.put(`/group/${jid}/photo`, data);
export const updateGroupDescription = (jid: string, description: string) => 
  api.put(`/group/${jid}/description`, { description });
export const setGroupLock = (jid: string, lock: boolean) => api.post(`/group/${jid}/settings/lock`, { lock });
export const setGroupAnnounce = (jid: string, announce: boolean) => 
  api.post(`/group/${jid}/settings/announce`, { announce });
export const getGroupParticipants = (jid: string) => api.get(`/group/${jid}/participants`);
export const addParticipant = (jid: string, phone: string) => 
  api.post(`/group/${jid}/participants/add`, { participants: [phone] });
export const removeParticipant = (jid: string, participantJid: string) => 
  api.post(`/group/${jid}/participants/remove`, { participants: [participantJid] });
export const promoteParticipant = (jid: string, participantJid: string) => 
  api.post(`/group/${jid}/participants/promote`, { participants: [participantJid] });
export const demoteParticipant = (jid: string, participantJid: string) => 
  api.post(`/group/${jid}/participants/demote`, { participants: [participantJid] });
export const getInviteLink = (jid: string) => api.get(`/group/${jid}/invite`);
export const revokeInviteLink = (jid: string) => api.post(`/group/${jid}/invite/revoke`);

// User
export const checkContact = (phone: string) => api.get(`/user/check?phone=${phone}`);
export const getUserInfo = (phone: string) => api.get(`/user/info?phone=${phone}`);
export const updateAvatar = (data: FormData) => api.post('/user/avatar', data);
export const updatePushName = (name: string) => api.put('/user/name', { name });
export const getMyPrivacy = () => api.get('/user/my/privacy');

// Newsletter
export const getMyNewsletters = () => api.get('/user/my/newsletters');
export const unfollowNewsletter = (jid: string) => api.post('/newsletter/unfollow', { jid });

export default api;
