import axios from 'axios';

interface ApiConfig {
  baseURL: string;
  deviceId: string;
}

export interface GetChatMessagesParams {
  limit?: number;
  offset?: number;
  media_only?: boolean;
  search?: string;
  start_time?: string;
  end_time?: string;
  is_from_me?: boolean;
}

export interface GetChatsParams {
  search?: string;
  has_media?: boolean;
  limit?: number;
  offset?: number;
}

export const getGowaBaseUrl = () => {
  const fallback = 'https://gowa.ekacode.web.id';
  if (typeof window === 'undefined') {
    return (import.meta.env.API_URL || fallback).replace(/\/+$/, '');
  }
  const stored =
    localStorage.getItem('gowa_base_url') ||
    import.meta.env.API_URL ||
    fallback;
  return stored.replace(/\/+$/, '');
};

const getConfig = (): ApiConfig => {
  let baseURL = getGowaBaseUrl();
  const deviceId = localStorage.getItem('gowa_device_id') || '';

  if (import.meta.env.DEV && !localStorage.getItem('gowa_base_url')) {
    baseURL = '/api';
  }

  return { baseURL, deviceId };
};

export const api = axios.create({
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const { baseURL, deviceId } = getConfig();

  config.baseURL = baseURL;

  const username =
    localStorage.getItem('gowa_username') || import.meta.env.API_USER || '';
  const password =
    localStorage.getItem('gowa_password') || import.meta.env.API_PASS || '';

  if (username && password) {
    const token = btoa(`${username}:${password}`);
    config.headers = config.headers || {};
    if (!('Authorization' in config.headers)) {
      (config.headers as Record<string, unknown>).Authorization = `Basic ${token}`;
    }
  }

  if (deviceId && config.url) {
    const url = config.url;
    const isDeviceManagement =
      url.startsWith('/devices') || url.startsWith('devices');

    if (!isDeviceManagement) {
      const params = (config.params || {}) as Record<string, unknown>;
      if (params.device_id === undefined) {
        params.device_id = deviceId;
      }
      config.params = params;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const getAppStatus = () => api.get('/app/status');
export const appLogin = () => api.get('/app/login');
export const appLoginWithCode = (phone?: string) =>
  api.get('/app/login-with-code', { params: phone ? { phone } : {} });
export const appLogout = () => api.get('/app/logout');
export const appReconnect = () => api.get('/app/reconnect');
export const getAppDevices = () => api.get('/app/devices');
export const getDevices = () => api.get('/devices');
export const getDeviceStatus = (id: string) => api.get(`/devices/${id}/status`);
export const getDeviceInfo = (id: string) => api.get(`/devices/${id}`);
export const createDevice = (customId?: string) =>
  api.post('/devices', customId ? { device_id: customId } : {});
export const deleteDevice = (id: string) =>
  api.delete(`/devices/${encodeURIComponent(id)}`);
export const getDeviceQR = (id: string) =>
  api.get(`/devices/${encodeURIComponent(id)}/login`);
export const loginWithCode = (id: string, phone: string) =>
  api.post(`/devices/${encodeURIComponent(id)}/login/code`, { phone });
export const reconnectDevice = (id: string) =>
  api.post(`/devices/${encodeURIComponent(id)}/reconnect`);
export const logoutDevice = (id: string) =>
  api.post(`/devices/${encodeURIComponent(id)}/logout`);

export const getChats = (params?: GetChatsParams) =>
  api.get('/chats', { params });

export const getChatMessages = (jid: string, params?: GetChatMessagesParams) =>
  api.get(`/chat/${jid}/messages`, { params });

export const pinChat = (jid: string, pin: boolean) =>
  api.post(`/chat/${jid}/pin`, { pin });

export const labelChat = (jid: string, label: string) =>
  api.post(`/chat/${jid}/label`, { label });

export const archiveChat = (jid: string, archive: boolean) =>
  api.post(`/chat/${jid}/archive`, { archive });

export const setDisappearingMessages = (jid: string, duration: number) =>
  api.post(`/chat/${jid}/disappearing`, { duration });

export const markMessageRead = (id: string) =>
  api.post(`/message/${id}/read`);
export const deleteMessage = (id: string) =>
  api.post(`/message/${id}/delete`);
export const revokeMessage = (id: string) =>
  api.post(`/message/${id}/revoke`);
export const reactMessage = (id: string, reaction: string) =>
  api.post(`/message/${id}/reaction`, { reaction });
export const editMessage = (id: string, message: string) =>
  api.post(`/message/${id}/update`, { message });
export const starMessage = (id: string) => api.post(`/message/${id}/star`);
export const unstarMessage = (id: string) => api.post(`/message/${id}/unstar`);
export const downloadMedia = (id: string) =>
  api.get(`/message/${id}/download`, { responseType: 'blob' });

export const sendText = (phone: string, message: string) =>
  api.post('/send/message', { phone, message });
export const sendImage = (data: FormData) => api.post('/send/image', data);
export const sendVideo = (data: FormData) => api.post('/send/video', data);
export const sendAudio = (data: FormData) => api.post('/send/audio', data);
export const sendFile = (data: FormData) => api.post('/send/file', data);
export const sendDocument = (data: FormData) => api.post('/send/file', data);
export const sendPoll = (
  phone: string,
  question: string,
  options: string[],
  maxAnswers: number
) => api.post('/send/poll', { phone, question, options, maxAnswers });
export const sendLocation = (phone: string, lat: number, long: number) =>
  api.post('/send/location', { phone, latitude: lat, longitude: long });
export const sendContact = (phone: string, name: string, contactPhone: string) =>
  api.post('/send/contact', { phone, contact: { name, phone: contactPhone } });
export const sendSticker = (data: FormData) => api.post('/send/sticker', data);
export const sendLink = (phone: string, link: string, caption?: string) =>
  api.post('/send/link', { phone, link, caption });
export const sendPresence = (phone: string, presence: string) =>
  api.post('/send/presence', { phone, presence });
export const sendChatPresence = (phone: string, presence: string) =>
  api.post('/send/chat-presence', { phone, presence });

export const getMyGroups = (params?: { limit?: number; offset?: number }) =>
  api.get('/user/my/groups', { params });
export const createGroup = (name: string, participants: string[]) =>
  api.post('/group', { name, participants });
export const joinGroupWithLink = (link: string) =>
  api.post('/group/join-with-link', { link });
export const getGroupInfoFromLink = (link: string) =>
  api.get('/group/info-from-link', { params: { link } });
export const leaveGroup = (jid: string) =>
  api.post('/group/leave', { jid });
export const getGroupInfo = (jid: string) =>
  api.get('/group/info', { params: { jid } });
export const updateGroupName = (jid: string, name: string) =>
  api.post('/group/name', { jid, name });
export const updateGroupPhoto = (jid: string, data: FormData) => {
  const formData = new FormData();
  data.forEach((value, key) => formData.append(key, value));
  formData.append('jid', jid);
  return api.post('/group/photo', formData);
};
export const updateGroupDescription = (jid: string, description: string) =>
  api.post('/group/topic', { jid, topic: description });
export const setGroupLock = (jid: string, lock: boolean) =>
  api.post('/group/locked', { jid, locked: lock });
export const setGroupAnnounce = (jid: string, announce: boolean) =>
  api.post('/group/announce', { jid, announce });
export const getGroupParticipants = (jid: string) =>
  api.get('/group/participants', { params: { jid } });
export const addParticipant = (jid: string, phone: string) =>
  api.post('/group/participants', { jid, participants: [phone] });
export const removeParticipant = (jid: string, participantJid: string) =>
  api.post('/group/participants/remove', { jid, participants: [participantJid] });
export const promoteParticipant = (jid: string, participantJid: string) =>
  api.post('/group/participants/promote', { jid, participants: [participantJid] });
export const demoteParticipant = (jid: string, participantJid: string) =>
  api.post('/group/participants/demote', { jid, participants: [participantJid] });
export const exportGroupParticipants = (jid: string) =>
  api.get('/group/participants/export', { params: { jid }, responseType: 'blob' });
export const getGroupJoinRequests = (jid: string) =>
  api.get('/group/participant-requests', { params: { jid } });
export const approveGroupJoinRequest = (jid: string, participantJid: string) =>
  api.post('/group/participant-requests/approve', { jid, participants: [participantJid] });
export const rejectGroupJoinRequest = (jid: string, participantJid: string) =>
  api.post('/group/participant-requests/reject', { jid, participants: [participantJid] });
export const getInviteLink = (jid: string) =>
  api.get('/group/invite-link', { params: { jid } });
export const revokeInviteLink = (jid: string) =>
  api.post('/group/invite-link', { jid, reset: true });

export const checkContact = (phone: string) =>
  api.get(`/user/check?phone=${phone}`);
export const getUserInfo = (phone: string) =>
  api.get(`/user/info?phone=${phone}`);
export const getUserAvatar = (phone?: string) =>
  api.get('/user/avatar', { params: phone ? { phone } : {} });
export const updateAvatar = (data: FormData) =>
  api.post('/user/avatar', data);
export const updatePushName = (name: string) =>
  api.post('/user/pushname', { pushName: name });
export const getMyPrivacy = () =>
  api.get('/user/my/privacy');
export const getMyContacts = () =>
  api.get('/user/my/contacts');
export const getBusinessProfile = (phone?: string) =>
  api.get('/user/business-profile', { params: phone ? { phone } : {} });

export const getMyNewsletters = () =>
  api.get('/user/my/newsletters');
export const unfollowNewsletter = (jid: string) =>
  api.post('/newsletter/unfollow', { newsletter_id: jid });

export default api;
