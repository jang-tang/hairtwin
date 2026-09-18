import { Link } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { routeMap } from '../../lib/routes';
import { useConsultationStore } from '../../store/consultationStore';

export function StepGuard({ children }: PropsWithChildren) {
  const draft = useConsultationStore((s) => s.draft);
  if (!draft) {
    return (
      <div className="empty-state">
        <div>
          <h1>진행 중인 상담을 찾을 수 없습니다.</h1>
          <p>저장된 상담 초안이 없거나 새로고침으로 만료되었습니다.</p>
          <Link className="primary" to={routeMap.consultationStart}>새 상담 시작</Link>
        </div>
      </div>
    );
  }
  return children;
}
