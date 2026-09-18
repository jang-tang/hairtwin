import { useEffect, useRef, useState } from 'react';
import { Page } from '../../../components/common/Page';
import { useConsultationStore } from '../../../store/consultationStore';
import { useConsultationNavigation } from '../../../hooks/useConsultationNavigation';
import { captureFrame, openCamera, stopCamera } from '../../../services/camera/cameraService';
import { uploadImage } from '../../../services/apiClient';
import type { HairPhotos } from '../../../types/image';

const views: Array<keyof HairPhotos> = ['front', 'side', 'back'];
const labels = { front: '정면', side: '옆', back: '뒤' } as const;

export default function PhotoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photos = useConsultationStore(s => s.draft?.hairPhotos);
  const setPhoto = useConsultationStore(s => s.setPhoto);
  const { transitionTo } = useConsultationNavigation();
  const [active, setActive] = useState<keyof HairPhotos>('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    setCameraReady(false);
    setError('');

    if (!cameraOpen) return;
    const video = videoRef.current;
    if (!video) return;

    openCamera(video)
      .then(stream => {
        if (!mounted) {
          if (stream) stopCamera(video, stream);
          return;
        }
        streamRef.current = stream;
        setCameraReady(Boolean(stream));
      })
      .catch(e => {
        if (mounted) setError(e instanceof Error ? e.message : '카메라를 열 수 없습니다.');
      });

    return () => {
      mounted = false;
      setCameraReady(false);
      stopCamera(video, streamRef.current);
      streamRef.current = null;
    };
  }, [cameraOpen]);

  const idx = views.indexOf(active);
  const hasBack = Boolean(photos?.back);

  async function capture() {
    if (!videoRef.current || busy || !cameraReady) return;
    setBusy(true);
    setError('');
    try {
      const blob = await captureFrame(videoRef.current);
      if (!blob) throw new Error('촬영 이미지를 만들지 못했습니다. 카메라 영상이 준비된 뒤 다시 시도해주세요.');
      const uploaded = await uploadImage(blob, `hair-twin-${active}-${Date.now()}.jpg`);
      setPhoto(active, { id: uploaded.id, url: uploaded.url, source: 'camera' });
      if (idx < views.length - 1) setActive(views[idx + 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadImage(file, file.name);
      setPhoto(active, { id: uploaded.id, url: uploaded.url, source: 'upload' });
      if (idx < views.length - 1) setActive(views[idx + 1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function toggleCamera() {
    setError('');
    setCameraOpen(value => !value);
  }

  return <Page><section className="step-section">
    <p className="eyebrow">04 · 뒷모습 사진 &amp; 모발 체크</p>
    <h1>현재 머리 촬영 + 뒷모습·모발 확인</h1>
    <p className="muted">뒷모습은 필수입니다. 앞·옆까지 찍으면 초안 품질이 올라갑니다.</p>
    <div className="segmented">{views.map(view => <button key={view} className={active === view ? 'selected' : ''} onClick={() => setActive(view)}>{labels[view]} {photos?.[view] ? '✓' : ''}</button>)}</div>
    <div className="camera-stage">
      {cameraOpen ? <>
        <video ref={videoRef} playsInline muted className="camera-video" />
        {!cameraReady && <div className="camera-loading"><strong>카메라 준비 중…</strong><span>브라우저의 카메라 권한을 허용해주세요.</span></div>}
      </> : photos?.[active] ? <img src={photos[active].url} alt={labels[active]} /> : <div className="photo-placeholder"><strong>{labels[active]} 사진</strong><span>얼굴과 머리가 모두 보이도록 해주세요.</span></div>}
      {cameraOpen && photos?.[active] && <div className="captured-thumb"><img src={photos[active].url} alt="촬영 완료" /></div>}
    </div>
    <div className="panel" style={{ marginTop: 12 }}>
      <h2>모발 체크 (간단)</h2>
      <p className="muted">뒷모습 기준 손상·뜸 정도를 체크해주세요. 세부 설정은 다음 단계에서 이어집니다.</p>
    </div>
    <div className="button-row">
      <button className="secondary" onClick={toggleCamera}>{cameraOpen ? '사진 업로드로 전환' : '카메라 사용'}</button>
      {cameraOpen ? <button className="primary" disabled={busy || !cameraReady} onClick={capture}>{busy ? '업로드 중…' : photos?.[active] ? '다시 촬영' : '촬영하기'}</button> : <label className="primary file-button">{busy ? '업로드 중…' : '사진 선택'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} hidden disabled={busy}/></label>}
      {idx < views.length - 1 ? <button className="secondary" disabled={!photos?.[active]} onClick={() => setActive(views[idx + 1])}>다음</button> : <button className="primary" disabled={!hasBack || busy} onClick={() => transitionTo('style')}>다음: 프리셋 + 세부 설정</button>}
    </div>
    {error && <p className="error">{error}</p>}
  </section></Page>;
}
