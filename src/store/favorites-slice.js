import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../api/http';

// GET /api/v1/favorite-regions?page=&size=
export const fetchFavoriteRegions = createAsyncThunk(
  'favorites/fetchFavoriteRegions',
  async ({ page = 0, size = 10 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await http.get('/favorite-regions', {
        params: { page, size },
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Ошибка загрузки избранных регионов');
    }
  },
);

const initialState = {
  items: [], // content
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  numberOfElements: 0,
  first: true,
  last: true,
  empty: true,

  status: 'idle', // idle | loading | succeeded | failed
  error: null,
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    // Управление пагинацией из UI
    setPage(state, action) {
      state.page = action.payload;
    },
    setSize(state, action) {
      state.size = action.payload;
      state.page = 0; // при смене размера сбрасываем на первую страницу
    },

    /* Заранее закладываем локальные апдейтеры,
       чтобы позже добавить thunks для POST/DELETE
       и оптимистично обновлять список */

    addFavoriteRegionLocal(state, action) {
      const region = action.payload; // {id, name, coordinatesResponseDto}
      const exists = state.items.some((r) => r.id === region.id);
      if (!exists) {
        state.items.unshift(region);
        state.numberOfElements += 1;
        state.totalElements += 1;
        state.empty = state.items.length === 0;
      }
    },
    removeFavoriteRegionLocal(state, action) {
      const id = action.payload; // region id
      const before = state.items.length;
      state.items = state.items.filter((r) => r.id !== id);
      const after = state.items.length;
      if (after !== before) {
        state.numberOfElements = Math.max(0, state.numberOfElements - 1);
        state.totalElements = Math.max(0, state.totalElements - 1);
        state.empty = state.items.length === 0;
      }
    },

    // Очистка при логауте/ошибках
    resetFavoritesState() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavoriteRegions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFavoriteRegions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const data = action.payload || {};
        state.items = Array.isArray(data.content) ? data.content : [];
        state.page = typeof data.number === 'number' ? data.number : 0;
        state.size = typeof data.size === 'number' ? data.size : state.size;
        state.totalElements = data.totalElements ?? state.totalElements;
        state.totalPages = data.totalPages ?? state.totalPages;
        state.numberOfElements = data.numberOfElements ?? state.items.length;
        state.first = data.first ?? state.page === 0;
        state.last = data.last ?? state.page + 1 >= state.totalPages;
        state.empty = !!data.empty ?? state.items.length === 0;
      })
      .addCase(fetchFavoriteRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const {
  setPage,
  setSize,
  addFavoriteRegionLocal,
  removeFavoriteRegionLocal,
  resetFavoritesState,
} = favoritesSlice.actions;

export const selectFavorites = (state) => state.favorites;

export default favoritesSlice.reducer;
