import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  count: 0,
};

const userAuthSliceslice = createSlice({
  name: 'userAuth',
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      state.count -= 1;
    },
  },
});

export const userAuthActions = userAuthSliceslice.actions;
export default userAuthSliceslice.reducer;
