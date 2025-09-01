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

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    user: null, // данные профиля
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    clearProfile: (state) => {
      state.user = null;
      state.status = 'idle';
      state.error = null;
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
      });
  },
});

export const { clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
