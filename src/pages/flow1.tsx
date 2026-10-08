import { useEffect, useRef, useState } from 'react';
import { normalizePhoto, photoFromFile } from '../utils/photos';
import { useNavigate } from 'react-router-dom';
import { AppShell, PrimaryButton, SecondaryButton, PageHeader, Chip, Segmented, SliderControl, NoConsult, Guard, MockBadge } from '../components/ui';
import { useConsult, transitionTo } from '../stores/consultationStore';
import { usePresets, presetSummary } from '../stores/presetStore';
import { useDash, useUi } from '../stores/baseStores';
import { PRESETS, img, BANG_QUICK, bangLabel } from '../data';
import { mockPortrait, isMockMode } from '../mocks/mockImages';
import { useAiJob } from '../hooks/useAiJob';
import { AiJobProgress } from '../components/AiJobProgress';
import type { GenerationResult } from '../../server/src/providers/image/types';

function StepDots({ step, total }: { step: number; total: number }) {
  return <PageHeader title="" sub="" step={step} total={total} />;
}
const TOTAL = 10;

export function StartPage() {
  const nav = useNavigate();
  const { customerName, customerPhone, customerType, set } = useConsult();
  const [tab, setTab] = useState<'new' | 'existing'>(customerType);
  return (
    <AppShell>
      <PageHeader title="오늘의 상담을 시작할게요." sub="신규 고객과 기존 고객 중 선택해주세요." step={1} total={TOTAL} />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('new')} className={`flex-1 min-h-[52px] rounded-2xl border font-bold ${tab === 'new' ? 'bg-primary text-white border-primary' : 'border-line'}`}>신규 고객</button>
        <button onClick={() => setTab('existing')} className={`flex-1 min-h-[52px] rounded-2xl border font-bold ${tab === 'existing' ? 'bg-primary text-white border-primary' : 'border-line'}`}>기존 고객</button>
      </div>
      {tab === 'new' ? (
        <div className="border border-line rounded-3xl p-5 mb-4">
          <label className="font-semibold">이름</label>
          <input value={customerName} onChange={(e) => set({ customerName: e.target.value })}
            className="w-full min-h-[52px] border border-line rounded-2xl px-4 mt-2 mb-3" placeholder="예: 김민지" />
          <label className="font-semibold">전화번호 <span className="text-muted font-normal">(선택)</span></label>
          <input value={customerPhone} onChange={(e) => set({ customerPhone: e.target.value })}
            className="w-full min-h-[52px] border border-line rounded-2xl px-4 mt-2" placeholder="010-0000-0000" />
        </div>
      ) : (
        <ExistingPicker />
      )}
      <div className="border border-line rounded-3xl p-5 mb-5 bg-softBg">
        <p className="text-secondary text-[14px]">고객</p><p className="font-bold text-[20px]">{customerName || '새 고객'}</p>
        <p className="text-secondary text-[14px] mt-1">담당 · 지수 디자이너</p>
      </div>
      <PrimaryButton disabled={!customerName} onClick={() => { set({ customerType: tab }); transitionTo('intent', nav); }}>
        상담 시작
      </PrimaryButton>
    </AppShell>
  );
}
function ExistingPicker() {
  const { customers } = useDash();
  const set = useConsult((s) => s.set);
  const picked = useConsult((s) => s.customerName);
  return (
    <div className="grid gap-2 mb-4">
      {customers.map((c) => (
        <button key={c.id} onClick={() => set({ customerName: c.name })}
          className={`text-left border rounded-2xl p-4 min-h-[60px] ${picked === c.name ? 'border-primary bg-primarySoft' : 'border-line'}`}>
          <span className="font-bold">{c.name}</span> <span className="text-secondary text-[14px]">{c.phone}</span>
        </button>
      ))}
    </div>
  );
}

export function IntentPage() {
  const nav = useNavigate();
  const { intent, set } = useConsult();
  const options = ['지금 스타일을 유지하면서 깔끔하게', '지금보다 조금 다르게', '확실하게 새로운 스타일로', '잘 모르겠어요. 같이 찾아주세요.'];
  return (
    <AppShell>
      <Guard need={!!useConsult((s) => s.customerName)} fallback={<NoConsult />}>
        <PageHeader title="오늘 머리를 어느 정도 바꾸고 싶으세요?" sub="고객과 함께 하나를 눌러보세요." step={2} total={TOTAL} />
        <div className="grid gap-3 mb-6">
          {options.map((o, i) => (
            <button key={o} onClick={() => set({ intent: o })}
              className={`text-left border-2 rounded-3xl p-5 min-h-[76px] transition active:scale-[.99] ${intent === o ? 'border-primary bg-primarySoft' : 'border-line bg-white'}`}>
              <span className={`inline-block w-7 h-7 rounded-full text-white text-[14px] font-bold text-center leading-7 mr-2 ${intent === o ? 'bg-primary' : 'bg-line'}`}>{i + 1}</span>
              <span className="font-bold text-[17px]">{o}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => transitionTo('start', nav)}>이전</SecondaryButton>
          <div className="flex-1"><PrimaryButton disabled={!intent} onClick={() => transitionTo('photo', nav)}>다음 · 머리 촬영</PrimaryButton></div>
        </div>
      </Guard>
    </AppShell>
  );
}

export function PhotoPage() {
  const nav = useNavigate();
  const { photos, set } = useConsult();
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'front' | 'side' | 'back'>('front');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const labels = { front: '정면', side: '측면', back: '후면' };
  const done = photos.front && photos.side && photos.back;
  const save = async (load: () => Promise<string>) => {
    setBusy(true); setError('');
    try {
      const image = await load();
      set({ photos: { ...useConsult.getState().photos, [tab]: image } });
      if (tab === 'front') setTab('side'); else if (tab === 'side') setTab('back');
    } catch (e) { setError(e instanceof Error ? e.message : '사진을 불러오지 못했어요.'); }
    finally { setBusy(false); }
  };
  return (
    <AppShell>
      <PageHeader title="현재 머리를 세 방향에서 보여주세요." sub="얼굴과 머리 전체가 보이는 사진을 촬영하거나 선택해주세요." step={3} total={TOTAL} />
      <div className="flex gap-2 mb-4">
        {(['front','side','back'] as const).map(k => (
          <button key={k} disabled={busy} onClick={() => setTab(k)}
            className={`flex-1 min-h-[48px] rounded-xl border font-bold ${tab === k ? 'bg-ink text-white' : 'border-line'}`}>
            {photos[k] ? '● ' : '○ '}{labels[k]}
          </button>
        ))}
      </div>
      <p className="font-bold text-[18px] mb-2">{labels[tab]} 사진</p>
      <div className="rounded-3xl overflow-hidden border-2 border-line bg-softBg mb-4">
        {photos[tab] ? <img src={photos[tab]!} alt={labels[tab]} className="w-full aspect-square object-contain" /> :
          <div className="aspect-square flex items-center justify-center text-secondary">얼굴과 머리 끝까지 프레임에 담아주세요.</div>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="hidden"
        aria-label={labels[tab] + ' 고객 사진'} onChange={e => {
          const file = e.target.files?.[0]; e.target.value = '';
          if (file) void save(() => photoFromFile(file));
        }} />
      <PrimaryButton disabled={busy} onClick={() => input.current?.click()}>{busy ? '사진 준비 중…' : photos[tab] ? '사진 다시 선택' : '촬영 또는 사진 선택'}</PrimaryButton>
      {isMockMode() && <div className="mt-2"><SecondaryButton disabled={busy}
        onClick={() => void save(() => normalizePhoto(mockPortrait('customer-' + tab, tab, '연습용 사진', labels[tab])))}>연습용 사진 사용</SecondaryButton></div>}
      {error && <p role="alert" className="text-error mt-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <SecondaryButton onClick={() => transitionTo('intent', nav)}>이전</SecondaryButton>
        <div className="flex-1"><PrimaryButton disabled={!done || busy} onClick={() => transitionTo('style', nav)}>다음 · 스타일 고르기</PrimaryButton></div>
      </div>
    </AppShell>
  );
}

export function StylePage() {
  const nav = useNavigate();
  const { presetId, set } = useConsult();
  const stylistPresets = usePresets((s) => s.presets);
  const refreshPresets = usePresets((s) => s.refresh);
  useEffect(() => { void refreshPresets(); }, [refreshPresets]);
  return (
    <AppShell>
      <PageHeader title="마음에 드는 스타일을 눌러보세요." sub="고객이 직접 고르면 상담이 빨라져요." step={4} total={TOTAL} />
      {stylistPresets.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold">우리 매장 프리셋</p>
            <button onClick={() => nav('/presets/new')} className="text-primary text-[14px] font-bold">+ 등록</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {stylistPresets.map((m) => (
              <button key={m.id} onClick={() => set({ presetId: m.id })}
                className={`rounded-2xl overflow-hidden border-[3px] text-left transition active:scale-[.98] ${presetId === m.id ? 'border-primary shadow-[0_8px_24px_rgba(255,74,93,.25)]' : 'border-line'}`}>
                {m.refImages.length > 0 ? (
                  <img src={m.refImages[0]} alt={m.name} className="w-full aspect-square object-cover" />
                ) : (
                  <img src={isMockMode() ? mockPortrait(`stylist-${m.id}`, 'front', m.name, m.category) : img(`stylist${m.id}`, 400)} alt={m.name} className="w-full aspect-square object-cover" />
                )}
                <div className={`p-3 ${presetId === m.id ? 'bg-primarySoft' : ''}`}>
                  <p className="font-bold text-[16px]">{m.name}</p>
                  <p className="text-[13px] text-muted">{presetSummary(m)}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="font-bold mb-2">기본 스타일</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => set({ presetId: p.id })}
            className={`rounded-2xl overflow-hidden border-[3px] text-left transition active:scale-[.98] ${presetId === p.id ? 'border-primary shadow-[0_8px_24px_rgba(255,74,93,.25)]' : 'border-line'}`}>
            <img src={isMockMode() ? mockPortrait(`preset-${p.id}`, 'front', p.name, p.desc) : img(p.seed, 400)} alt={p.name} className="w-full aspect-square object-cover" />
            <div className={`p-3 ${presetId === p.id ? 'bg-primarySoft' : ''}`}>
              <p className="font-bold text-[16px]">{p.name}</p><p className="text-[13px] text-muted">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <SecondaryButton onClick={() => transitionTo('photo', nav)}>이전</SecondaryButton>
        <div className="flex-1"><PrimaryButton disabled={!presetId} onClick={() => transitionTo('condition', nav)}>다음 · 모발 특성</PrimaryButton></div>
      </div>
    </AppShell>
  );
}

export function ConditionPage() {
  const nav = useNavigate();
  const { condition, sideHair, set } = useConsult();
  const c = condition;
  const row = (label: string, opts: string[], v: string, k: keyof typeof c) => (
    <div className="mb-4">
      <p className="font-bold text-[16px] mb-2">{label}</p>
      <Segmented options={opts} value={v} onChange={(nv) => set({ condition: { ...c, [k]: nv } as typeof c })} />
    </div>
  );
  return (
    <AppShell>
      <PageHeader title="모발 특성을 알려주세요." sub="버튼만 누르면 돼요. 타이핑은 필요 없어요." step={5} total={TOTAL} />
      <div className="border border-line rounded-3xl p-5 mb-4">
        {row('손상도', ['건강', '건조', '손상', '극손상'], c.damage, 'damage')}
        {row('모질', ['직모', '반곱슬', '곱슬'], c.texture, 'texture')}
        {row('굵기', ['가늘음', '보통', '굵음'], c.thickness, 'thickness')}
        {row('밀도', ['낮음', '보통', '높음'], c.density, 'density')}
        {row('탄력', ['낮음', '보통', '높음'], c.elasticity, 'elasticity')}
        {row('모발 결', ['부드러움', '보통', '거침'], c.feel, 'feel')}
      </div>
      <div className="border border-line rounded-3xl p-5 mb-5">
        <p className="font-bold text-[16px] mb-1">옆머리 뜨는 정도</p>
        <p className="text-secondary text-[14px] mb-3">선택 즉시 상담에 반영돼요.</p>
        <Segmented options={['자연스럽게 떨어짐', '조금 뜸', '많이 뜸', '매우 많이 뜸'] as const} value={sideHair} onChange={(v) => set({ sideHair: v })} />
      </div>
      <BangBlock />
      <div className="flex gap-2 mt-4">
        <SecondaryButton onClick={() => transitionTo('style', nav)}>이전</SecondaryButton>
        <div className="flex-1"><PrimaryButton onClick={() => { set({ generationRequestId: crypto.randomUUID(), generationJobId: '', editJobId: '', editRequestId: '', sessionId: null, candidates: [], versions: [], chosenVersion: '', selectedCandidate: null }); transitionTo('generation', nav); }}>AI로 3가지 방향 만들기</PrimaryButton></div>
      </div>
    </AppShell>
  );
}

export function BangBlock() {
  const bang = useConsult((s) => s.bang);
  const set = useConsult((s) => s.set);
  return (
    <div className="border border-line rounded-3xl p-5">
      <p className="font-bold text-[16px]">앞머리 길이</p>
      <p className="text-secondary text-[14px] mb-3">가운데가 눈썹 위치예요. 위로 올리면 짧게(눈썹 위), 아래로 내리면 길게(눈썹 아래).</p>
      <SliderControl label="앞머리 길이" display={bangLabel(bang)} value={bang} onChange={(v) => set({ bang: v })} />
      <div className="relative h-5 mt-1 text-[12px] text-muted font-medium">
        <span className="absolute" style={{ left: '15%', transform: 'translateX(-50%)' }}>위 3cm</span>
        <span className="absolute text-primary font-bold" style={{ left: '45%', transform: 'translateX(-50%)' }}>눈썹선</span>
        <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>아래 3cm</span>
      </div>
      <div className="flex gap-2 flex-wrap mt-3">
        {BANG_QUICK.map((b) => (
          <Chip key={b.label} active={Math.abs(bang - b.v) < 8} onClick={() => set({ bang: b.v })}>{b.label}</Chip>
        ))}
      </div>
    </div>
  );
}

export function GenerationPage() {
  const nav = useNavigate();
  const [err, setErr] = useState(''), [attempt, setAttempt] = useState(0);
  const work = useAiJob('generate');
  useEffect(() => {
    if (work.job?.status !== 'completed' || !work.job.result) return;
    useConsult.getState().acceptGeneration(work.job.result as GenerationResult);
    transitionTo('candidates', nav);
  }, [work.job, nav]);
  useEffect(() => {
    if (work.id) return;
    const saved = useConsult.getState();
    if (saved.sessionId && saved.candidates.length) { transitionTo('candidates', nav); return; }
    let live = true;
    setErr('');
    (async () => {
      try {
        const s = useConsult.getState();
        if (!s.photos.front || !s.photos.side || !s.photos.back) throw new Error('정면·측면·후면 사진을 모두 선택해주세요.');
        const builtin = PRESETS.find(p => p.id === s.presetId);
        const preset = usePresets.getState().presets.find(p => p.id === s.presetId) ??
          (builtin ? { ...builtin, refImages: [] } : null);
        if (!preset) throw new Error('스타일을 선택해주세요.');
        const requestId = s.generationRequestId || crypto.randomUUID();
        s.set({ generationRequestId: requestId });
        const refs = await Promise.all(preset.refImages.slice(0, 2).map(normalizePhoto));
        if (!live) return;
        await work.start({
          requestId, customerName: s.customerName, intent: s.intent,
          photos: { front: s.photos.front, side: s.photos.side, back: s.photos.back },
          presetId: s.presetId ?? undefined, preset: { ...preset, refImages: refs },
          condition: s.condition, bang: s.bang, sideLength: s.sideLength, sideHair: s.sideHair,
        });
      } catch (e) { if (live) setErr(e instanceof Error ? e.message : '생성에 실패했어요. 다시 시도해주세요.'); }
    })();
    return () => { live = false; };
  }, [attempt, work.id, work.start]);
  return (
    <AppShell>
      <PageHeader title="3가지 방향을 만들고 있어요." sub="고객 사진과 상담 조건을 반영해 후보별로 앞·옆·뒤를 준비해요." step={6} total={TOTAL} />
      <AiJobProgress job={work.job} error={err || work.error} sending={work.sending} onCancel={work.cancel} onRetry={work.retry} />
      {err && !work.id && <div className="mt-4"><PrimaryButton onClick={() => setAttempt(n => n + 1)}>작업 시작 다시 시도</PrimaryButton></div>}
      <div className="mt-4"><SecondaryButton disabled={work.busy} onClick={() => {
        work.clear(); useConsult.getState().set({ generationRequestId: '' }); transitionTo('condition', nav);
      }}>상담 조건으로 돌아가기</SecondaryButton></div>
    </AppShell>
  );
}
