import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http, setAuthToken } from '../api/http';

const initialState = {
  isLoggedIn: false,
  token: null,
  credentials: null, // последние отправленные данные формы
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
};

// POST /api/v1/auth/login  -> { token: "..." }
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await http.post('/auth/login', { email, password });
      // Ожидаем data = { token: '...' }
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Ошибка авторизации';
      return rejectWithValue(message);
    }
  },
);

const userAuthSlice = createSlice({
  name: 'userAuth',
  initialState,
  reducers: {
    logout(state) {
      state.isLoggedIn = false;
      state.token = null;
      state.credentials = null;
      setAuthToken(null);
      localStorage.removeItem('auth_token');
    },
    // гидратация при старте приложения
    hydrateFromStorage(state, action) {
      const token = action.payload;
      if (token) {
        state.token = token;
        state.isLoggedIn = true;
        setAuthToken(token);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isLoggedIn = true;
        state.token = action.payload.token;
        setAuthToken(action.payload.token); // ← далее все запросы пойдут с Bearer
        localStorage.setItem('auth_token', action.payload.token); // ← чтобы не терять при перезагрузке
        console.log('Токен получен:', action.payload.token); // по желанию: лог
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Ошибка авторизации';
      });
  },
});

export const { logout, hydrateFromStorage } = userAuthSlice.actions;
export default userAuthSlice.reducer;
