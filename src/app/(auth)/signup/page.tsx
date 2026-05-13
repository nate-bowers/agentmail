import { Metadata } from 'next';
import TopNav from '@/components/layout/TopNav';
import AuthForm from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNav variant="auth" mode="signup" />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
