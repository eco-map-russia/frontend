import axios from 'axios';

// пример значения: http://localhost:8080/api/v1
const base = process.env.REACT_APP_API_BASE_URL || '/api/v1';

export const http = axios.create({
  baseURL: base.replace(/\/+$/, ''), // срежем хвостовые "/"
});

export const setAuthToken = (token) => {
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete http.defaults.headers.common.Authorization;
};
