import axios from 'axios';

export const http = axios.create({
  baseURL: '/api/v1', // у нас Swagger на :8080, а сами эндпоинты начинаются с /api/v1
});

// вспомогательная функция — вызывать при установке/очистке токена
export const setAuthToken = (token) => {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
};
