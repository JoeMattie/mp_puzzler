// packages/client/src/pages/Home.tsx
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Multiplayer Puzzler</h1>
      <p style={{ margin: '20px 0' }}>Solve jigsaw puzzles together in real-time</p>
      <Link to="/create">
        <button className="btn-primary">Create New Puzzle</button>
      </Link>
    </div>
  );
}
