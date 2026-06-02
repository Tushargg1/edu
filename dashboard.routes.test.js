import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Base RTK Query API. All feature-specific endpoints are injected
 * from separate files (authApi, dashboardApi, etc.) to keep code split.
 */
const edusyncApi = createApi({
  reducerPath: 'edusyncApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include', // send httpOnly cookies (refresh token)
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: [
    'Auth',
    'Dashboard',
    'Student',
    'Teacher',
    'Attendance',
    'Calendar',
    'Notification',
  ],
  endpoints: () => ({}), // injected per-feature
});

export default edusyncApi;
