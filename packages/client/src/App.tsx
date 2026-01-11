// packages/client/src/App.tsx
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './stores/auth';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Play } from './pages/Play';

export default function App() {
  const { initialize, isLoading } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="/play/:slug" element={<Play />} />
    </Routes>
  );
}
