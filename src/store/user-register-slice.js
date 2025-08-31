// src/store/user-register-slice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../api/http';

const initialState = {
  status: 'idle', // idle | loading | succeeded | failed
  error: null, // текст ошибки
  credentials: null, // последние отправленные данные формы
  response: null, // ответ сервера
};

// POST /api/v1/auth/register
export const register = createAsyncThunk('auth/register', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await http.post('/auth/register', formData);
    return data;
  } catch (err) {
    const message =
      err.response?.data?.message || err.response?.data?.error || 'Ошибка регистрации';
    return rejectWithValue(message);
  }
});

const userRegisterSlice = createSlice({
  name: 'userRegister',
  initialState,
  reducers: {
    reset(state) {
      state.status = 'idle';
      state.error = null;
      state.response = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.credentials = action.meta.arg; // запомним, что отправляли
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.response = action.payload;
        console.log('Регистрация успешна:', action.payload);
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Ошибка регистрации';
      });
  },
});

export const { reset } = userRegisterSlice.actions;
export default userRegisterSlice.reducer;
