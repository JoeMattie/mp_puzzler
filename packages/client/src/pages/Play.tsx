// packages/client/src/pages/Play.tsx
import { useParams } from 'react-router-dom';
import { PuzzleCanvas } from '../components/PuzzleCanvas';

export function Play() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <div>Invalid game URL</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <PuzzleCanvas gameSlug={slug} />
    </div>
  );
}
