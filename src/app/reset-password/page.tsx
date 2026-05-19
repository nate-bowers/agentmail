import { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = { title: 'Set a new password' };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav variant="auth" mode="login" />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
