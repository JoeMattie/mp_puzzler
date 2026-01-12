// packages/client/src/pages/Home.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface GameListItem {
  id: string;
  urlSlug: string;
  pieceCount: number;
  imageName: string;
  imageUrl: string;
  createdAt: string;
  playerCount: number;
}

export function Home() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchGames = async () => {
    try {
      const data = await api.games.list();
      setGames(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDelete = async (slug: string) => {
    try {
      await api.games.delete(slug);
      setGames(games.filter((g) => g.urlSlug !== slug));
    } catch (err: any) {
      alert(err.message || 'Failed to delete game');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Multiplayer Puzzler</h1>
      <p style={{ margin: '20px 0', textAlign: 'center' }}>Solve jigsaw puzzles together in real-time</p>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <Link to="/create">
          <button className="btn-primary">Create New Puzzle</button>
        </Link>
      </div>

      <h2 style={{ marginBottom: '15px' }}>Active Games</h2>

      {loading && <p>Loading games...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && games.length === 0 && (
        <p style={{ color: '#666' }}>No active games. Create one to get started!</p>
      )}

      {games.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {games.map((game) => (
            <div
              key={game.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: '#fafafa',
              }}
            >
              <img
                src={game.imageUrl}
                alt={game.imageName}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{game.imageName}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {game.pieceCount} pieces | {game.playerCount} player{game.playerCount !== 1 ? 's' : ''} online
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>Created: {formatDate(game.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/play/${game.urlSlug}`)}
                  style={{ padding: '8px 16px' }}
                >
                  Join
                </button>
                <button
                  onClick={() => handleDelete(game.urlSlug)}
                  disabled={game.playerCount > 0}
                  style={{
                    padding: '8px 16px',
                    background: game.playerCount > 0 ? '#ccc' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: game.playerCount > 0 ? 'not-allowed' : 'pointer',
                  }}
                  title={game.playerCount > 0 ? 'Cannot delete while players are connected' : 'Delete game'}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
