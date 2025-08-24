import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../api/http';

// GET /api/v1/regions  -> массив регионов
export const fetchRegions = createAsyncThunk('regions/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await http.get('/regions'); // токен уже подставится через setAuthToken
    // если хочешь сразу распарсить geoJson — раскомментируй ниже:
    // const parsed = data.map(r => ({ ...r, geometry: JSON.parse(r.geoJson) }));
    // return parsed;
    return data;
  } catch (err) {
    const message = err.response?.data?.message || 'Не удалось загрузить регионы';
    return rejectWithValue(message);
  }
});

const initialState = {
  items: [], // здесь будет массив регионов
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
};

const regionsSlice = createSlice({
  name: 'regions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRegions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // либо parsed, если парсишь
      })
      .addCase(fetchRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default regionsSlice.reducer;
