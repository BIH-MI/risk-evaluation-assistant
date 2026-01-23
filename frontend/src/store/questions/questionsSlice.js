import { createSlice } from '@reduxjs/toolkit';
import {
    fetchQuestions,
} from './questionsThunks';

const initialState = {
    items: [],
    status: 'idle',
    error: null
};

const questionsSlice = createSlice({
    name: 'questions',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(fetchQuestions.pending, state => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchQuestions.fulfilled, (state, { payload }) => {
                state.status = 'succeeded';
                state.items = payload; // Store all questions in the single 'items' array
            })
            .addCase(fetchQuestions.rejected, (state, { payload }) => {
                state.status = 'failed';
                state.error = payload;
            });
    }
});

export default questionsSlice.reducer;
