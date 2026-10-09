import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL de producción conectada a Render y Supabase
export const BASE_API_URL = 'https://alquila-backend.onrender.com/api';

const api = axios.create({
  baseURL: BASE_API_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@alquila_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error leyendo token de AsyncStorage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
