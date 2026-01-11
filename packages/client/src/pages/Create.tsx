// packages/client/src/pages/Create.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const PIECE_COUNTS = [200, 300, 400, 500, 600, 700, 800, 900];

export function Create() {
  const navigate = useNavigate();
  const [images, setImages] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pieceCount, setPieceCount] = useState(400);
  const [tileType, setTileType] = useState('classic');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.images.list().then(setImages).catch(console.error);
  }, []);

  async function handleCreate() {
    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const game = await api.games.create({
        imageId: selectedImage,
        pieceCount,
        tileType,
      });
      navigate(`/play/${game.urlSlug}`);
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: 800, margin: '0 auto' }}>
      <h1>Create New Puzzle</h1>

      <section style={{ marginTop: 30 }}>
        <h2>1. Select an Image</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginTop: 16 }}>
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img.id)}
              style={{
                cursor: 'pointer',
                border: selectedImage === img.id ? '3px solid #667eea' : '3px solid transparent',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <img src={img.url} alt={img.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
              <div style={{ padding: 8, background: '#222', textAlign: 'center' }}>{img.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>2. Number of Pieces</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {PIECE_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => setPieceCount(count)}
              className={pieceCount === count ? 'btn-primary' : 'btn-secondary'}
            >
              {count}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>3. Tile Style</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setTileType('classic')}
            className={tileType === 'classic' ? 'btn-primary' : 'btn-secondary'}
          >
            Classic
          </button>
          <button disabled style={{ opacity: 0.5 }} className="btn-secondary">
            Pentagon (Coming Soon)
          </button>
        </div>
      </section>

      {error && (
        <div style={{ marginTop: 20, padding: 16, background: '#ff5252', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <button
          onClick={handleCreate}
          disabled={isCreating || !selectedImage}
          className="btn-primary"
          style={{ width: '100%', padding: 16, fontSize: 18 }}
        >
          {isCreating ? 'Creating...' : 'Create Puzzle'}
        </button>
      </div>
    </div>
  );
}
