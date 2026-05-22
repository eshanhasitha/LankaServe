import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './lib/auth-context.tsx';

const SESSION_KEY = 'lanka.web.auth';

function renderAt(path, session = null) {
  localStorage.clear();
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  test('redirects protected customer route to login when unauthenticated', async () => {
    renderAt('/customer/dashboard');
    expect(await screen.findByText(/Access your LankaServe account/i)).toBeInTheDocument();
  });

  test('supports customer post-service alias route', async () => {
    renderAt('/customer/post-a-service', {
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      user: { _id: 'u1', role: 'customer', name: 'Anura Perera', email: 'anura.p@email.com' },
    });
    expect(await screen.findByText(/^Post a Service$/i)).toBeInTheDocument();
  });

  test('supports customer search-providers alias route', async () => {
    renderAt('/customer/search-providers', {
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      user: { _id: 'u1', role: 'customer', name: 'Anura Perera', email: 'anura.p@email.com' },
    });
    expect(await screen.findAllByText(/Search Providers/i)).not.toHaveLength(0);
  });

  test('supports customer job details route', async () => {
    renderAt('/customer/my-jobs/LS-4920', {
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      user: { _id: 'u1', role: 'customer', name: 'Anura Perera', email: 'anura.p@email.com' },
    });
    expect(await screen.findByText(/Job not found/i)).toBeInTheDocument();
  });

  test('supports customer provider profile route', async () => {
    renderAt('/customer/providers/kamal-weerasinghe', {
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      user: { _id: 'u1', role: 'customer', name: 'Anura Perera', email: 'anura.p@email.com' },
    });
    expect(await screen.findByText(/Provider profile is unavailable/i)).toBeInTheDocument();
  });

  test('supports customer notifications route', async () => {
    renderAt('/customer/notifications', {
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      user: { _id: 'u1', role: 'customer', name: 'Anura Perera', email: 'anura.p@email.com' },
    });
    expect(await screen.findByRole('heading', { name: /^Notifications$/i })).toBeInTheDocument();
  });

  test('supports public footer routes', async () => {
    renderAt('/contact');
    expect(await screen.findByRole('heading', { name: /^Contact Us$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/eshanhasitha55@gmail\.com/i)).not.toHaveLength(0);
  });

  test('unknown route falls back to landing page', async () => {
    renderAt('/some/unknown/path');
    expect(await screen.findByText(/Find Trusted/i)).toBeInTheDocument();
  });
});

