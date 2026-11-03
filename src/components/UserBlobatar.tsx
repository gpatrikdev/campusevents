import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';

// Travel above 6 has no visible effect: blobatar keeps the eyes inside the face.
const gazeOptions = { travel: 6, settle: 40, lookAt: 'pointer' } as const;

/** The signed-in user's face, the same size everywhere: 96px, or 72px on phones. */
export function UserBlobatar({ name }: { name: string }) {
  const gaze = useGaze(gazeOptions);
  const compact = useMediaQuery('(max-width: 42rem)');
  return <Blobatar ref={gaze.ref} name={name} size={compact ? 72 : 96} animate="always" />;
}
