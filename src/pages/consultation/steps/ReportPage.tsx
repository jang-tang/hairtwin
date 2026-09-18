import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useAuthStore } from '../../../store/authStore';
import { consultationRepository } from '../../../repositories/consultationRepository';
import { saveReport } from '../../../services/apiClient';
import { routeMap } from '../../../lib/routes';
import { getBangLengthLabel } from '../../../lib/bangLength';
import type { ConsultationReport } from '../../../types/consultation';

export default function ReportPage() {
  const draft = useConsultationStore(s => s.draft);
  const stylist = useAuthStore(s => s.stylist);
  const clear = useConsultationStore(s => s.clear);
  const [status, setStatus] = useState<'saving'|'saved'|'error'>('saving');
  const [error, setError] = useState('');
  const [treated, setTreated] = useState(false);

  const report = useMemo<ConsultationReport | null>(() => {
    if (!draft || !stylist || !draft.finalStyle) return null;
    return {
      id: draft.id,
      customerId: draft.customerId,
      stylistId: stylist.id,
      createdAt: new Date().toISOString().slice(0, 10),
      hairPhotos: draft.hairPhotos,
      intent: draft.intent,
      serviceMode: draft.serviceMode,
      gender: draft.gender,
      customerType: draft.customerType,
      isFirstVisit: draft.isFirstVisit,
      referenceImage: draft.referenceImage,
      hairCondition: draft.hairCondition,
      selectedPreset: draft.selectedPresetId,
      candidates: draft.candidates,
      versions: draft.versions,
      customerFeedback: draft.feedback,
      stylistAdjustments: draft.stylistAdjustment ? [draft.stylistAdjustment] : [],
      finalStyle: draft.finalStyle,
      notes: draft.notes,
      serviceType: draft.serviceMode === 'trim' ? '다듬어주세요' : '새로운 스타일',
      consent: true,
    };
  }, [draft, stylist]);

  useEffect(() => {
    if (!report) return;
    let mounted = true;
    consultationRepository.save(report);
    saveReport(report).then(() => mounted && setStatus('saved')).catch((e) => { if (mounted) { setStatus('error'); setError(e instanceof Error ? e.message : '서버 저장 실패'); } });
    return () => { mounted = false; };
  }, [report]);

  if (!report) return <StepGuard><Page><div className="empty-state"><h1>리포트를 만들 수 없습니다.</h1></div></Page></StepGuard>;

  function backToDashboard() { clear(); window.location.href = routeMap.dashboard; }

  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">09 · 시술 진행 &amp; 정보 저장</p><h1>시술하고 저장하세요.</h1>
    <div className="report-hero"><div className="report-images">{[report.finalStyle.frontImage,report.finalStyle.sideImage,report.finalStyle.backImage].filter(Boolean).map((src,i)=><img key={src} src={src} alt={`report-${i}`} />)}</div><div><p className="eyebrow">FINAL STYLE</p><h2>{report.finalStyle.name}</h2><p>{report.finalStyle.description}</p><p>유형 · {report.serviceType}</p><p>앞머리 · {getBangLengthLabel(report.finalStyle.bangLength ?? 50)}</p><p>고객 요청 · {report.customerFeedback.at(-1)?.text ?? '없음'}</p><p>메모 · {report.notes || '없음'}</p></div></div>
    <div className="panel">
      <label className="select-row"><span>시술 완료</span><input type="checkbox" checked={treated} onChange={e => setTreated(e.target.checked)} /></label>
      <p className="muted">시술이 끝나면 체크하고 대시보드로 돌아가면 고객 정보·저장 정보에 자동 기록됩니다.</p>
      <strong>저장 상태</strong><p>{status === 'saving' ? '브라우저와 서버에 저장 중입니다…' : status === 'saved' ? '서버 저장 완료' : `서버 저장 실패: ${error}`}</p>
    </div>
    <Link className="primary wide" onClick={backToDashboard} to={routeMap.dashboard}>대시보드로 돌아가기</Link>
    {!treated && <p className="muted">* 시술 전에도 저장은 되지만, 완료 체크를 권장합니다.</p>}
  </section></Page></StepGuard>;
}
