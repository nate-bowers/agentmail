import { Metadata } from 'next';
import AuthForm from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; error_description?: string };
}) {
  const errorMessage = searchParams.error_description
    ? decodeURIComponent(searchParams.error_description).replace(/\+/g, ' ')
    : searchParams.error === 'auth_callback_failed'
    ? 'Sign-in failed. Please try again.'
    : searchParams.error
    ? decodeURIComponent(searchParams.error).replace(/\+/g, ' ')
    : undefined;

  return <AuthForm mode="login" initialError={errorMessage} />;
}
