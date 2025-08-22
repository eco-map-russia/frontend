// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { hydrateFromStorage } from './user-auth-slice';

const store = configureStore({
  reducer: { auth: authReducer },
});

// Гидратация при запуске приложения
const savedToken = localStorage.getItem('auth_token');
store.dispatch(hydrateFromStorage(savedToken));

export default store;
