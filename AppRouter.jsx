import { useState } from 'react';
import {
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useDeleteTeacherMutation,
} from '../../store/api/teacherApi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';

export default function TeachersPage() {
  const { data, isLoading } = useGetTeachersQuery();
  const [createTeacher, { isLoading: creating }] = useCreateTeacherMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subjects: '', password: '' });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const teachers = data?.data?.teachers || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.email || !form.password) {
      setFormError('Name, email, and password are required');
      return;
    }
    try {
      await createTeacher({
        name: form.name,
        email: form.email,
        phone: form.phone,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
        password: form.password,
      }).unwrap();
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', subjects: '', password: '' });
      setSuccess('Teacher created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err?.data?.error?.message || 'Failed to create teacher');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await deleteTeacher(id).unwrap();
    } catch {
      // ignore
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <p className="font-medium text-text-pri">{row.name}</p>
      ),
    },
    { key: 'teacherId', label: 'Teacher ID', mono: true },
    { key: 'email', label: 'Email' },
    {
      key: 'subjects',
      label: 'Subjects',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.subjects?.map((s) => (
            <Badge key={s} variant="info">{s}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'present' : 'absent'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row._id); }}
          className="text-danger hover:text-red-700 text-xs font-medium cursor-pointer"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-pri font-sans">Teachers</h2>
          <p className="text-sm text-text-sec font-sans mt-1">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Teacher</Button>
      </div>

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-border p-12 animate-pulse h-64" />
      ) : (
        <DataTable columns={columns} data={teachers} emptyMessage="No teachers found" />
      )}

      {/* Add Teacher Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Teacher"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Teacher</Button>
          </>
        }
      >
        {formError && <Alert variant="danger" className="mb-4">{formError}</Alert>}
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="teacher-name" label="Full Name" placeholder="e.g. Priya Sharma"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="teacher-email" label="Email" type="email" placeholder="priya@school.edu"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            id="teacher-phone" label="Phone" placeholder="+91 98765 43210"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            id="teacher-subjects" label="Subjects" placeholder="Maths, Science, English"
            hint="Comma-separated list"
            value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })}
          />
          <Input
            id="teacher-password" label="Password" type="password" placeholder="Set initial password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
