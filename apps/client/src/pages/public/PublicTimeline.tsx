import React from 'react';
import TimelinePage from '../../public/components/TimelinePage';
import { usePublicData } from '../../hooks/usePublicData';

export default function PublicTimeline() {
  const serverData = usePublicData('/timeline');

  return <TimelinePage {...serverData} />;
}
