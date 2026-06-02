import { useState } from 'react';
import {
  useGetStudentsQuery,
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useBulkUploadStudentsMutation,
} from '../../store/api/studentApi';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';

export default function StudentsPage() {
  const [filters, setFilters] = useState({ class: '', section: '' });
  const { data, isLoading } = useGetStudentsQuery(filters);
  const [createStudent, { isLoading: creating }] = useCreateStudentMutation();
  const [deleteStudent] = useDeleteStudentMutation();
  const [bulkUpload, { isLoading: uploading }] = useBulkUploadStudentsMutation();

  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({
    name: '', class: '', section: '', rollNumber: '', dob: '',
    gender: 'male', parentName: '', parentPhone: '', password: '',
  });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const students = data?.data?.students || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.class || !form.section || !form.password) {
      setFormError('Name, class, section, and password are required');
      return;
    }
    try {
      await createStudent(form).unwrap();
      setShowAdd(false);
      setForm({ name: '', class: '', section: '', rollNumber: '', dob: '', gender: 'male', parentName: '', parentPhone: '', password: '' });
      setSuccess('Student added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err?.data?.error?.message || 'Failed to create student');
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await bulkUpload(formData).unwrap();
      setShowBulk(false);
      setSuccess('Bulk upload successful');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err?.data?.error?.message || 'Bulk upload failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteStudent(id).unwrap();
    } catch {
      // ignore
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => <p className="font-medium text-text-pri">{row.name}</p>,
    },
    { key: 'studentId', label: 'Student ID', mono: true },
    {
      key: 'class',
      label: 'Class',
      render: (row) => `${row.class} ${row.section || ''}`,
    },
    { key: 'rollNumber', label: 'Roll No' },
    {
      key: 'parentName',
      label: 'Parent',
      render: (row) => row.parentName || '—',
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-pri font-sans">Students</h2>
          <p className="text-sm text-text-sec font-sans mt-1">
            {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowBulk(true)}>
            CSV Upload
          </Button>
          <Button onClick={() => setShowAdd(true)}>+ Add Student</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="Filter by class"
          value={filters.class}
          onChange={(e) => setFilters({ ...filters, class: e.target.value })}
          className="rounded-[10px] border-[1.5px] border-border px-3 py-2 text-sm font-sans text-text-pri placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 w-36"
        />
        <input
          placeholder="Filter by section"
          value={filters.section}
          onChange={(e) => setFilters({ ...filters, section: e.target.value })}
          className="rounded-[10px] border-[1.5px] border-border px-3 py-2 text-sm font-sans text-text-pri placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 w-36"
        />
      </div>

      {success && <Alert variant="success" onDismiss={() => setSuccess('')}>{success}</Alert>}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-border p-12 animate-pulse h-64" />
      ) : (
        <DataTable columns={columns} data={students} emptyMessage="No students found" />
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Student"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Add Student</Button>
          </>
        }
      >
        {formError && <Alert variant="danger" className="mb-4">{formError}</Alert>}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="s-name" label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input id="s-class" label="Class" placeholder="e.g. 6" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} />
          <Input id="s-section" label="Section" placeholder="e.g. A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          <Input id="s-roll" label="Roll Number" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
          <Input id="s-dob" label="Date of Birth" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-pri font-sans">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="rounded-[10px] border-[1.5px] border-border px-3.5 py-2.5 text-sm font-sans text-text-pri bg-white focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input id="s-parent" label="Parent Name" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
          <Input id="s-parent-phone" label="Parent Phone" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
          <Input id="s-password" label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="md:col-span-2" />
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        title="Bulk Upload Students"
      >
        <div className="text-center py-6">
          <p className="text-sm text-text-sec font-sans mb-4">
            Upload a CSV file with columns: name, class, section, rollNumber, dob, gender, parentName, parentPhone, password
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary-lt text-primary rounded-xl cursor-pointer hover:bg-blue-200 transition-colors font-sans font-medium text-sm">
            {uploading ? 'Uploading...' : 'Choose CSV File'}
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
