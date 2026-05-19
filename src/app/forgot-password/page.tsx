import { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav variant="auth" mode="login" />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
