import edusyncApi from './edusyncApi';

const studentApi = edusyncApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query({
      query: (params) => ({
        url: '/students',
        params,
      }),
      providesTags: (result) =>
        result?.data?.students
          ? [
              ...result.data.students.map((s) => ({ type: 'Student', id: s._id })),
              { type: 'Student', id: 'LIST' },
            ]
          : [{ type: 'Student', id: 'LIST' }],
    }),
    getStudentById: builder.query({
      query: (id) => `/students/${id}`,
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),
    createStudent: builder.mutation({
      query: (body) => ({
        url: '/students',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }, 'Dashboard'],
    }),
    bulkUploadStudents: builder.mutation({
      query: (formData) => ({
        url: '/students/bulk',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }, 'Dashboard'],
    }),
    updateStudent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/students/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id },
        { type: 'Student', id: 'LIST' },
      ],
    }),
    deleteStudent: builder.mutation({
      query: (id) => ({
        url: `/students/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }, 'Dashboard'],
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useGetStudentByIdQuery,
  useCreateStudentMutation,
  useBulkUploadStudentsMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} = studentApi;

export default studentApi;
