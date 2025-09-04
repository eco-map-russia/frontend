import { configureStore } from '@reduxjs/toolkit';
import authReducer, { hydrateFromStorage } from './user-auth-slice';
import registerReducer from './user-register-slice';
import profileReducer from './user-profile-slice';
import regionsReducer from './regions-slice';
import filterReducer from './filter-slice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    register: registerReducer,
    profile: profileReducer,
    regions: regionsReducer, // ← подключили ветку regions
    filter: filterReducer,
  },
});

// Гидратация при запуске приложения
const savedToken = localStorage.getItem('auth_token');
store.dispatch(hydrateFromStorage(savedToken));

export default store;
