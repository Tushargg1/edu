import { useState } from 'react';
import {
  useGetCalendarEventsQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
} from '../../store/api/calendarApi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';

const EVENT_TYPES = ['Holiday', 'Exam', 'School_Event', 'PTM', 'Vacation'];

const EVENT_BADGE = {
  Holiday: 'holiday',
  Exam: 'exam',
  School_Event: 'event',
  PTM: 'ptm',
  Vacation: 'vacation',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '', eventType: 'Holiday', startDate: '', endDate: '', description: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useGetCalendarEventsQuery();
  const [createEvent, { isLoading: creating }] = useCreateCalendarEventMutation();
  const [deleteEvent] = useDeleteCalendarEventMutation();

  const events = data?.data?.events || [];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getEventsForDate = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    return events.filter((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title || !form.startDate || !form.endDate) {
      setFormError('Title, start date, and end date are required');
      return;
    }
    try {
      await createEvent(form).unwrap();
      setShowAdd(false);
      setForm({ title: '', eventType: 'Holiday', startDate: '', endDate: '', description: '' });
    } catch (err) {
      setFormError(err?.data?.error?.message || 'Failed to create event');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await deleteEvent(id).unwrap(); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-pri font-sans">
          Academic Calendar
        </h2>
        <Button onClick={() => setShowAdd(true)}>+ Add Event</Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-text-sec cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h3 className="text-base font-semibold text-text-pri font-sans">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-text-sec cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 animate-pulse h-96" />
        ) : (
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-text-muted font-sans py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before first of month */}
              {[...Array(firstDay)].map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px]" />
              ))}

              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                const isToday =
                  day === now.getDate() &&
                  currentMonth === now.getMonth() &&
                  currentYear === now.getFullYear();

                return (
                  <div
                    key={day}
                    className={`
                      min-h-[80px] p-1.5 rounded-xl border transition-colors
                      ${isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50'}
                    `}
                  >
                    <span className={`
                      text-xs font-medium font-sans
                      ${isToday ? 'text-primary' : 'text-text-sec'}
                    `}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev._id}
                          className="group relative"
                        >
                          <Badge
                            variant={EVENT_BADGE[ev.eventType] || 'info'}
                            className="!text-[10px] !px-1.5 !py-0 truncate max-w-full block cursor-pointer"
                          >
                            {ev.title}
                          </Badge>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-text-muted">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="text-base font-semibold text-text-pri font-sans mb-4">All Events</h3>
        <div className="space-y-3">
          {events.length === 0 && (
            <p className="text-sm text-text-muted">No events created yet</p>
          )}
          {events.map((ev) => (
            <div key={ev._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors">
              <div className="flex items-center gap-3">
                <Badge variant={EVENT_BADGE[ev.eventType] || 'info'}>
                  {ev.eventType?.replace('_', ' ')}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-text-pri">{ev.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(ev.startDate).toLocaleDateString()} — {new Date(ev.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(ev._id)}
                className="text-danger hover:text-red-700 text-xs font-medium cursor-pointer"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Calendar Event"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Event</Button>
          </>
        }
      >
        {formError && <Alert variant="danger" className="mb-4">{formError}</Alert>}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input id="ev-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-pri font-sans">Event Type</label>
            <select
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm font-sans text-text-pri bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="ev-start" label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input id="ev-end" label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Input id="ev-desc" label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
