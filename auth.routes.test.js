import edusyncApi from './edusyncApi';

const attendanceApi = edusyncApi.injectEndpoints({
  endpoints: (builder) => ({
    submitAttendance: builder.mutation({
      query: (body) => ({
        url: '/attendance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    getAttendance: builder.query({
      query: (params) => ({
        url: '/attendance',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getStudentAttendance: builder.query({
      query: (studentId) => `/attendance/student/${studentId}`,
      providesTags: (result, error, studentId) => [
        { type: 'Attendance', id: studentId },
      ],
    }),
    updateAttendance: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/attendance/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Attendance', 'Dashboard'],
    }),
    getClassReport: builder.query({
      query: ({ className, section }) => ({
        url: `/attendance/report/${className}`,
        params: section ? { section } : undefined,
      }),
      providesTags: ['Attendance'],
    }),
  }),
});

export const {
  useSubmitAttendanceMutation,
  useGetAttendanceQuery,
  useGetStudentAttendanceQuery,
  useUpdateAttendanceMutation,
  useGetClassReportQuery,
} = attendanceApi;

export default attendanceApi;
