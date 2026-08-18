import axios from 'axios';

// प्रोडक्शन और लोकल के लिए लाइव बैकएंड URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudbot-saas.onrender.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// हर रिक्वेस्ट के साथ ऑटोमैटिक JWT टोकन अटैच करना
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 1. Auth APIs
export const registerUser = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/register', { email, password });
  return res.data;
};

export const loginUser = async (email: string, password: string) => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

// 2. Training APIs
export const trainWebsite = async (botId: string, url: string) => {
  const res = await apiClient.post('/train/website', { bot_id: botId, url });
  return res.data;
};

export const trainYouTube = async (botId: string, youtubeUrl: string) => {
  const res = await apiClient.post('/train/youtube', { bot_id: botId, youtube_url: youtubeUrl });
  return res.data;
};

export const trainPdf = async (botId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/train/pdf/${botId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// 3. Chat & History APIs
export const askBot = async (botId: string, question: string) => {
  const res = await apiClient.post('/chat/', { bot_id: botId, question });
  return res.data;
};

export const getChatHistory = async (botId: string) => {
  const res = await apiClient.get(`/chat/history/${botId}`);
  return res.data;
};

// 4. Bot Management APIs (No invalid keyword args)
export const createNewBot = async (data: {
  name: string;
  system_prompt?: string;
  temperature?: number;
}) => {
  const res = await apiClient.post('/bots/', data);
  return res.data;
};

export const getUserBots = async () => {
  const res = await apiClient.get('/bots/');
  return res.data;
};