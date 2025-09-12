// src/store/favorites-slice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../api/http';

export const fetchFavoriteRegions = createAsyncThunk(
  'favorites/fetchFavoriteRegions',
  async ({ page = 0, size = 10 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await http.get('/favorite-regions', { params: { page, size } });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Ошибка загрузки избранных регионов');
    }
  },
);

// ⬇️ НОВОЕ: удаление региона
export const deleteFavoriteRegion = createAsyncThunk(
  'favorites/deleteFavoriteRegion',
  async ({ id }, { getState, dispatch, rejectWithValue }) => {
    try {
      await http.delete(`/favorite-regions/${encodeURIComponent(id)}`);

      // Если удаляем последний элемент на странице (и это не первая страница),
      // подгрузим предыдущую страницу, чтобы не остаться на пустой
      const { favorites } = getState();
      const willBeEmpty = favorites.items.length === 1 && favorites.page > 0;
      if (willBeEmpty) {
        const nextPage = favorites.page - 1;
        await dispatch(fetchFavoriteRegions({ page: nextPage, size: favorites.size }));
        return { id, refetched: true };
      }

      return { id, refetched: false };
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Не удалось удалить регион');
    }
  },
);

const initialState = {
  items: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  numberOfElements: 0,
  first: true,
  last: true,
  empty: true,
  status: 'idle',
  error: null,

  // ⬇️ НОВОЕ: флаги удаления по id
  deletingIds: {}, // { [id]: true }
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    setPage(state, action) {
      state.page = action.payload;
    },
    setSize(state, action) {
      state.size = action.payload;
      state.page = 0;
    },

    addFavoriteRegionLocal(state, action) {
      const r = action.payload;
      if (!state.items.some((x) => x.id === r.id)) {
        state.items.unshift(r);
        state.totalElements += 1;
        state.numberOfElements += 1;
        state.empty = state.items.length === 0;
      }
    },
    removeFavoriteRegionLocal(state, action) {
      const id = action.payload;
      const before = state.items.length;
      state.items = state.items.filter((x) => x.id !== id);
      const diff = before - state.items.length;
      if (diff > 0) {
        state.totalElements = Math.max(0, state.totalElements - diff);
        state.numberOfElements = Math.max(0, state.numberOfElements - diff);
        state.empty = state.items.length === 0;
      }
    },
    resetFavoritesState() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchFavoriteRegions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFavoriteRegions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const d = action.payload || {};
        state.items = Array.isArray(d.content) ? d.content : [];
        state.page = typeof d.number === 'number' ? d.number : 0;
        state.size = typeof d.size === 'number' ? d.size : state.size;
        state.totalElements = d.totalElements ?? state.totalElements;
        state.totalPages = d.totalPages ?? state.totalPages;
        state.numberOfElements = d.numberOfElements ?? state.items.length;
        state.first = d.first ?? state.page === 0;
        state.last = d.last ?? state.page + 1 >= state.totalPages;
        state.empty = d.empty ?? state.items.length === 0;
      })
      .addCase(fetchFavoriteRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // delete
      .addCase(deleteFavoriteRegion.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) state.deletingIds[id] = true;
        state.error = null;
      })
      .addCase(deleteFavoriteRegion.fulfilled, (state, action) => {
        const { id } = action.payload || {};
        if (id) {
          delete state.deletingIds[id];
          // Удаляем локально (если произошёл рефетч — список всё равно перезапишется)
          const before = state.items.length;
          state.items = state.items.filter((x) => x.id !== id);
          const diff = before - state.items.length;
          if (diff > 0) {
            state.totalElements = Math.max(0, state.totalElements - diff);
            state.numberOfElements = Math.max(0, state.numberOfElements - diff);
            state.empty = state.items.length === 0;
          }
        }
      })
      .addCase(deleteFavoriteRegion.rejected, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) delete state.deletingIds[id];
        state.error = action.payload || 'Не удалось удалить регион';
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

export const selectFavorites = (state) => state.favorites ?? initialState;
export default favoritesSlice.reducer;
