import React from 'react';
import PredictionsPage from '../../public/components/PredictionsPage';
import { usePublicData } from '../../hooks/usePublicData';

export default function PublicPredictions() {
  const serverData = usePublicData('/predictions');

  return <PredictionsPage {...serverData} />;
}
