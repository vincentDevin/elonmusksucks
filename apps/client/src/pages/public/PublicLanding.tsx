import React from 'react';
import LandingPage from '../../public/components/LandingPage';
import { usePublicData } from '../../hooks/usePublicData';

export default function PublicLanding() {
  const serverData = usePublicData('/');

  return <LandingPage {...serverData} />;
}
