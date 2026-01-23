import { createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const fetchRiskBands = createAsyncThunk(
  'riskBands/fetchAll',
  async (token, { rejectWithValue }) => {
    try {
      // Updated endpoint to match the backend controller
      const res = await fetch(`${API_URL}/api/risk-bands`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Server error while fetching risk bands.');

      return await res.json();

    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);