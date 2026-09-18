import { useState } from 'react';
import { Page } from '../../../components/common/Page';
import { StepGuard } from '../../../components/consultation/StepGuard';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { uploadImage } from '../../../services/apiClient';
import type { CustomerGender, CustomerType } from '../../../types/consultation';

export default function FirstVisitPage() {
  const draft = useConsultationStore(s => s.draft);
  const setFirstVisit = useConsultationStore(s => s.setFirstVisit);
  const setReferenceImage = useConsultationStore(s => s.setReferenceImage);
  const { transitionTo } = useConsultationNavigation();
  const [isFirst, setIsFirst] = useState(draft?.isFirstVisit ?? true);
  const [gender, setGender] = useState<CustomerGender | null>(draft?.gender ?? null);
  const [customerType, setCustomerType] = useState<CustomerType | null>(draft?.customerType ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleReference(file: File) {
    setBusy(true); setError('');
    try {
      const uploaded = await uploadImage(file, file.name);
      setReferenceImage({ id: uploaded.id, url: uploaded.url, source: 'upload' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드 실패');
    } finally { setBusy(false); }
  }

  const canNext = gender && customerType && (isFirst ? Boolean(draft?.referenceImage) : true);

  function next() {
    setFirstVisit({ isFirstVisit: isFirst, gender, customerType });
    transitionTo('intent');
  }

  return <StepGuard><Page><section className="step-section">
    <p className="eyebrow">02 · 첫방문 확인 (IF 처음이면)</p>
    <h1>처음 오셨나요? 3가지만 확인할게요.</h1>

    <div className="panel">
      <h2>처음 방문 여부</h2>
      <div className="segmented">
        <button className={isFirst ? 'selected' : ''} onClick={() => setIsFirst(true)}>처음이에요</button>
        <button className={!isFirst ? 'selected' : ''} onClick={() => setIsFirst(false)}>재방문이에요</button>
      </div>
    </div>

    {isFirst && (
      <div className="panel">
        <h2>1. 원하는 스타일 사진</h2>
        <p className="muted">고객님이 가져온 사진, 캡처, SNS 저장본 모두 가능합니다.</p>
        {draft?.referenceImage
          ? <img src={draft.referenceImage.url} alt="원하는 스타일" style={{ maxWidth: 240, borderRadius: 12 }} />
          : <div className="photo-placeholder"><strong>아직 사진 없음</strong><span>원하는 스타일 사진을 올려주세요.</span></div>}
        <label className="secondary file-button" style={{ marginTop: 8 }}>{busy ? '업로드 중…' : '원하는 스타일 사진 올리기'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={e => e.target.files?.[0] && handleReference(e.target.files[0])} />
        </label>
      </div>
    )}

    <div className="panel">
      <h2>2. 뒷모습 사진 &amp; 모발 체크 안내</h2>
      <p className="muted">뒷모습 촬영과 모발 상태 체크는 다음 단계(현재 머리 촬영)에서 진행합니다. 뒷머리 숱·손상·이력을 미리 물어봐 주세요.</p>
    </div>

    <div className="panel">
      <h2>3. 남녀 / 고객 유형 분기</h2>
      <div className="button-row">
        <div className="segmented">
          <button className={gender === 'female' ? 'selected' : ''} onClick={() => setGender('female')}>여성</button>
          <button className={gender === 'male' ? 'selected' : ''} onClick={() => setGender('male')}>남성</button>
        </div>
        <div className="segmented">
          <button className={customerType === 'first' ? 'selected' : ''} onClick={() => setCustomerType('first')}>신규</button>
          <button className={customerType === 'returning' ? 'selected' : ''} onClick={() => setCustomerType('returning')}>기존</button>
        </div>
      </div>
      <p className="muted">성별에 따라 프리셋 목록이 자동 필터링됩니다.</p>
    </div>

    {error && <p className="error">{error}</p>}
    <button className="primary wide" disabled={!canNext} onClick={next}>
      {!gender || !customerType ? '성별과 고객 유형을 선택해주세요' : (isFirst && !draft?.referenceImage ? '원하는 스타일 사진을 올려주세요' : '다음: 다듬 / 새로운 스타일')}
    </button>
  </section></Page></StepGuard>;
}
