import edusyncApi from './edusyncApi';

const teacherApi = edusyncApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeachers: builder.query({
      query: (params) => ({
        url: '/teachers',
        params,
      }),
      providesTags: (result) =>
        result?.data?.teachers
          ? [
              ...result.data.teachers.map((t) => ({ type: 'Teacher', id: t._id })),
              { type: 'Teacher', id: 'LIST' },
            ]
          : [{ type: 'Teacher', id: 'LIST' }],
    }),
    getTeacherById: builder.query({
      query: (id) => `/teachers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Teacher', id }],
    }),
    createTeacher: builder.mutation({
      query: (body) => ({
        url: '/teachers',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }, 'Dashboard'],
    }),
    updateTeacher: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/teachers/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Teacher', id },
        { type: 'Teacher', id: 'LIST' },
      ],
    }),
    deleteTeacher: builder.mutation({
      query: (id) => ({
        url: `/teachers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Teacher', id: 'LIST' }, 'Dashboard'],
    }),
  }),
});

export const {
  useGetTeachersQuery,
  useGetTeacherByIdQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
} = teacherApi;

export default teacherApi;
