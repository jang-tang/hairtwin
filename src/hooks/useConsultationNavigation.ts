import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeMap, type ConsultationStep } from '../lib/routes';
import { useConsultationStore } from '../store/consultationStore';

export function useConsultationNavigation() {
  const navigate = useNavigate();
  const start = useConsultationStore((s) => s.start);
  const transitionTo = useCallback((step: ConsultationStep) => {
    navigate(routeMap[step]);
  }, [navigate]);
  return { transitionTo, start };
}
