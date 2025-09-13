import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../api/http';

// thunk для получения профиля
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await http.get('/me'); // GET /api/v1/me
      return data; // {id, email, firstName, lastName, phone}
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Ошибка загрузки профиля');
    }
  },
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  /**
   * payload: { firstName, lastName, phone }
   */
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.patch('/me', payload); // PATCH /api/v1/me
      // сервер может вернуть либо весь профиль, либо только изменённые поля
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Ошибка обновления профиля');
    }
  },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    user: null, // данные профиля
    status: 'idle', // idle | loading | succeeded | failed
    error: null,

    updateStatus: 'idle', // загрузка обновления
    updateError: null,
  },
  reducers: {
    clearProfile: (state) => {
      state.user = null;
      state.status = 'idle';
      state.error = null;
    },
    clearUpdateState: (state) => {
      state.updateStatus = 'idle';
      state.updateError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // updateProfile
      .addCase(updateProfile.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const patch = action.payload;
        // на всякий случай аккуратно мержим
        state.user = { ...(state.user || {}), ...(patch || {}) };
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload;
      });
  },
});

const hasAdminRole = (roles) => {
  if (Array.isArray(roles)) {
    return roles.some((r) => typeof r === 'string' && r.toUpperCase() === 'ROLE_ADMIN');
  }
  // На всякий случай поддержим ошибочный ответ вида { role: 'ROLE_ADMIN' }
  if (roles && typeof roles === 'object' && typeof roles.role === 'string') {
    return roles.role.toUpperCase() === 'ROLE_ADMIN';
  }
  if (typeof roles === 'string') {
    return roles.toUpperCase() === 'ROLE_ADMIN';
  }
  return false;
};

export const selectProfile = (state) => state.profile;
export const selectIsAdmin = (state) => hasAdminRole(state.profile.user?.roles);

export const { clearProfile, clearUpdateState } = profileSlice.actions;
export default profileSlice.reducer;
