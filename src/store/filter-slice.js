import { createSlice } from '@reduxjs/toolkit';

const initialState = { value: null }; // null либо { id, label }

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    // payload: null ИЛИ { id, label }
    setFilter(state, action) {
      state.value = action.payload;
      console.log(`Текущий фильтр (из store):`, state.value);
    },
    clearFilter(state) {
      state.value = null;
      console.log(`Фильтр очищен, текущее значение:`, state.value);
    },
  },
});

export const { setFilter, clearFilter } = filterSlice.actions;
export const selectActiveFilter = (state) => state.filter.value;
export default filterSlice.reducer;
