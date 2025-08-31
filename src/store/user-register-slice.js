// src/store/user-auth-slice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  count: 0,
};

const userRegisterSlice = createSlice({
  name: 'userRegister',
  initialState,
  reducers: {
    submitRegister: (state, action) => {
      // по твоему ТЗ — лог прямо из слайса
      console.log('Данные Регистрации из слайса:', action.payload);
    },
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      state.count -= 1;
    },
  },
});

export const { submitRegister } = userRegisterSlice.actions;
export default userRegisterSlice.reducer;
