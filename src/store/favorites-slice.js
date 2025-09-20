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

export const addFavoriteRegion = createAsyncThunk(
  'favorites/addFavoriteRegion',
  async ({ id }, { rejectWithValue }) => {
    try {
      // POST /api/v1/favorite-regions/{regionId}
      await http.post(`/favorite-regions/${encodeURIComponent(id)}`);
      return { id };
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Не удалось добавить регион в избранное');
    }
  },
);

// удаление региона
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

  // ⬇️  флаги для отслеживания процессов добавления/удаления
  deletingIds: {}, // { [id]: true }
  addingIds: {}, // { [id]: true } — какие регионы сейчас добавляются
  lastAddedId: null, // id последнего успешно добавленного (опционально для UI)

  ids: {}, // { [id]: true }
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
      const r = action.payload; // {id, name, coordinatesResponseDto:{lat,lon}}
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
      // --- fetch ---
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

        // пересобираем/обновляем индекс избранного
        const nextIds = {};
        for (const it of state.items) {
          if (it?.id != null) nextIds[String(it.id)] = true;
        }
        // Вариант 1 (перезаписать индекс целиком):
        // state.ids = nextIds;

        // Вариант 2 (рекомендую): мерджим, чтобы не терять id,
        // которые пришли из addFavoriteRegion.fulfilled или с других страниц
        state.ids = { ...state.ids, ...nextIds };
      })
      .addCase(fetchFavoriteRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- delete ---
      .addCase(deleteFavoriteRegion.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) state.deletingIds[id] = true;
        state.error = null;
      })
      .addCase(deleteFavoriteRegion.fulfilled, (state, action) => {
        const { id } = action.payload || {};
        if (!id) return;

        // снимаем флаг "удаляется"
        delete state.deletingIds[id];

        // убираем из списка (если не было рефетча)
        const before = state.items.length;
        state.items = state.items.filter((x) => x.id !== id);
        const diff = before - state.items.length;
        if (diff > 0) {
          state.totalElements = Math.max(0, state.totalElements - diff);
          state.numberOfElements = Math.max(0, state.numberOfElements - diff);
          state.empty = state.items.length === 0;
        }

        // чистим индекс
        delete state.ids[String(id)];

        // опционально
        if (state.lastAddedId === id) state.lastAddedId = null;
      })
      .addCase(deleteFavoriteRegion.rejected, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) delete state.deletingIds[id];
        state.error = action.payload || 'Не удалось удалить регион';
      })

      // --- add ---
      .addCase(addFavoriteRegion.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) state.addingIds[id] = true;
      })
      .addCase(addFavoriteRegion.fulfilled, (state, action) => {
        const id = action.payload?.id;
        if (!id) return;
        delete state.addingIds[id];
        state.lastAddedId = id;
        state.ids[String(id)] = true; // фиксируем в индексе — важно для UI
      })
      .addCase(addFavoriteRegion.rejected, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) delete state.addingIds[id];
        state.error = action.payload || 'Не удалось добавить регион в избранное';
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

export const selectIsFavoriteById = (state, id) => {
  const rid = id == null ? null : String(id);
  if (!rid) return false;
  const fav = !!state.favorites?.ids?.[rid];
  const adding = !!state.favorites?.addingIds?.[rid];
  return fav || adding;
};
export const selectFavorites = (state) => state.favorites ?? initialState;
export default favoritesSlice.reducer;
