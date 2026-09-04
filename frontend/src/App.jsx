import { useState } from 'react';
import { api } from './api';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import ErrorBoundary from './ErrorBoundary';
import './styles.css';

export default function App() {
  const [user, setUser] = useState(() => {
    const existing = api.getToken();
    if (existing) {
      try {
        const payload = JSON.parse(atob(existing.split('.')[1]));
        return { id: payload.sub, email: payload.email };
      } catch {
        api.setToken(null);
      }
    }
    return null;
  });

  function handleSignOut() {
    api.setToken(null);
    setUser(null);
  }

  return (
    <ErrorBoundary>
      {user ? (
        <Dashboard user={user} onSignOut={handleSignOut} />
      ) : (
        <LandingPage onAuthed={setUser} />
      )}
    </ErrorBoundary>
  );
}
