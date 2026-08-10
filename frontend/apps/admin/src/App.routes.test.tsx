import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.tsx';
import { AdminAuthProvider } from './lib/auth-context.tsx';

const STORAGE_KEY = 'lanka.admin.auth';

function renderAdminAt(path: string, session: any = null) {
  localStorage.clear();
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminAuthProvider>
        <App />
      </AdminAuthProvider>
    </MemoryRouter>,
  );
}

describe('Admin App Routing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('redirects unauthenticated user to login page', async () => {
    renderAdminAt('/dashboard');
    expect(await screen.findByText(/Access the restricted LankaServe admin console/i)).toBeInTheDocument();
  });

  test('renders login form elements', async () => {
    renderAdminAt('/login');
    expect(await screen.findByRole('button', { name: /LOGIN/i })).toBeInTheDocument();
  });

  test('unknown route falls back to login page for unauthenticated users', async () => {
    renderAdminAt('/unknown/random/route');
    expect(await screen.findByText(/Access the restricted LankaServe admin console/i)).toBeInTheDocument();
  });
});
