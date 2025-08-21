import { configureStore } from '@reduxjs/toolkit';
import userAuthSlice from './user-auth-slice';

const store = configureStore({
  reducer: {
    auth: userAuthSlice,
  },
});

export default store;
