import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import edusyncApi from './api/edusyncApi';

const store = configureStore({
  reducer: {
    auth: authReducer,
    [edusyncApi.reducerPath]: edusyncApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(edusyncApi.middleware),
});

export default store;
