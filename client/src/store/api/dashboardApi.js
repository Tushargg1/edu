import edusyncApi from './edusyncApi';

const dashboardApi = edusyncApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query({
      query: () => '/dashboard/admin',
      providesTags: ['Dashboard'],
    }),
    getTeacherDashboard: builder.query({
      query: () => '/dashboard/teacher',
      providesTags: ['Dashboard'],
    }),
    getStudentDashboard: builder.query({
      query: () => '/dashboard/student',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetTeacherDashboardQuery,
  useGetStudentDashboardQuery,
} = dashboardApi;

export default dashboardApi;
