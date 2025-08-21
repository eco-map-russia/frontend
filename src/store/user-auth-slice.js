import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  count: 0,
  credentials: null, // последние отправленные данные формы
  isLoggedIn: false,
};

const userAuthSliceslice = createSlice({
  name: 'userAuth',
  initialState,
  reducers: {
    submitLogin: (state, action) => {
      // action.payload ожидаем вида { email, password }
      state.credentials = action.payload;
      state.isLoggedIn = true;

      // по твоему ТЗ — лог прямо из слайса
      console.log('Данные логина из слайса:', action.payload);
      console.log(state.credentials);
    },
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      state.count -= 1;
    },
  },
});

export const userAuthActions = userAuthSliceslice.actions;
export default userAuthSliceslice.reducer;
