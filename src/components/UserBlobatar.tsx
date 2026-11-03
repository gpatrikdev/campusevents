import { Blobatar } from '@blobatar/react';
import { useGaze } from '@blobatar/react/gaze';
import 'blobatar/motion.css';
import 'blobatar/gaze.css';

// Travel above 6 has no visible effect: blobatar keeps the eyes inside the face.
const gazeOptions = { travel: 6, settle: 40, lookAt: 'pointer' } as const;

export function UserBlobatar({ name, size }: { name: string; size: number }) {
  const gaze = useGaze(gazeOptions);
  return <Blobatar ref={gaze.ref} name={name} size={size} animate="always" />;
}
