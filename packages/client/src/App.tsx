// packages/client/src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Play } from './pages/Play';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="/play/:slug" element={<Play />} />
    </Routes>
  );
}
