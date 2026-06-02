import edusyncApi from './edusyncApi';

const calendarApi = edusyncApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarEvents: builder.query({
      query: (params) => ({
        url: '/calendar',
        params,
      }),
      providesTags: ['Calendar'],
    }),
    createCalendarEvent: builder.mutation({
      query: (body) => ({
        url: '/calendar',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Calendar', 'Dashboard'],
    }),
    updateCalendarEvent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/calendar/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Calendar'],
    }),
    deleteCalendarEvent: builder.mutation({
      query: (id) => ({
        url: `/calendar/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Calendar', 'Dashboard'],
    }),
  }),
});

export const {
  useGetCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
} = calendarApi;

export default calendarApi;
