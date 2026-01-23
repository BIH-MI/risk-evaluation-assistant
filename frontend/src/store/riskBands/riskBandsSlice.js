import { createSlice } from '@reduxjs/toolkit';
// Import the renamed thunk
import { fetchRiskBands } from './riskBandsThunks';

const initialState = {
  items: [],
  status: 'idle',
  error: null
};

const riskBandsSlice = createSlice({
  name: 'riskBands', // Update slice name
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRiskBands.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRiskBands.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        state.items = payload;
      })
      .addCase(fetchRiskBands.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error = payload;
      });
  }
});

export default riskBandsSlice.reducer;