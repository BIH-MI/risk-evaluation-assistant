import { createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const fetchQuestions = createAsyncThunk(
    'questions/fetchAll',
    async (token, { rejectWithValue }) => {
        try {
            // Call the new, unified API endpoint
            const res = await fetch(`${API_URL}/api/questions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Server error while fetching questions');
            return await res.json();
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);
