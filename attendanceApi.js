import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { useLoginMutation } from '../../store/api/authApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';

const ROLE_HOME = {
  super_admin: '/super-admin/dashboard',
  school_admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId.trim() || !password) {
      setError('Please enter your User ID and password');
      return;
    }

    try {
      const res = await login({ userId: userId.trim(), password }).unwrap();

      if (res.success) {
        dispatch(
          setCredentials({
            user: res.data.user,
            accessToken: res.data.accessToken,
          })
        );
        const home = ROLE_HOME[res.data.user.role] || '/';
        navigate(home, { replace: true });
      }
    } catch (err) {
      const msg =
        err?.data?.error?.message || 'Login failed. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-[0_8px_24px_rgba(37,99,235,0.20)] mb-4">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
          <h1 className="text-3xl font-display text-text-pri">EduSync</h1>
          <p className="text-sm text-text-sec font-sans mt-1">
            School Management Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-[0_4px_16px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] p-8 border border-border">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text-pri font-sans">
              Welcome back
            </h2>
            <p className="text-sm text-text-sec font-sans mt-1">
              Sign in with your User ID and password
            </p>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4" onDismiss={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="userId"
              label="User ID"
              placeholder="e.g. DPS-RKP-T-012"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
              autoComplete="username"
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              }
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          <p className="text-xs text-text-muted font-sans text-center mt-6">
            Contact your school administrator if you forgot your credentials
          </p>
        </div>

        <p className="text-xs text-text-muted font-sans text-center mt-6">
          © {new Date().getFullYear()} EduSync. All rights reserved.
        </p>
      </div>
    </div>
  );
}
