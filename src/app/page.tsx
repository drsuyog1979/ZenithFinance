import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard by default. The middleware will bounce unauthenticated users to /login
  redirect('/dashboard');
}
