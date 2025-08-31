import { configureStore } from '@reduxjs/toolkit';
import authReducer, { hydrateFromStorage } from './user-auth-slice';
import registerReducer from './user-register-slice';
import regionsReducer from './regions-slice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    register: registerReducer,
    regions: regionsReducer, // ← подключили ветку regions
  },
});

// Гидратация при запуске приложения
const savedToken = localStorage.getItem('auth_token');
store.dispatch(hydrateFromStorage(savedToken));

export default store;
