import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, PrimaryButton, SecondaryButton, PageHeader, Chip, Segmented, SliderControl, NoConsult, Guard, MockBadge } from '../components/ui';
import { useConsult, transitionTo, makeCandidates, stepOrder } from '../stores/consultationStore';
import { usePresets, presetSummary } from '../stores/presetStore';
import { useDash, useUi } from '../stores/baseStores';
import { PRESETS, img, BANG_QUICK, bangLabel } from '../data';
import { mockPortrait, isMockMode } from '../mocks/mockImages';
import { requestGeneration } from '../api/aiClient';

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
  const [tab, setTab] = useState<'front' | 'side' | 'back'>('front');
  const labels = { front: '정면을 바라봐주세요.', side: '옆모습을 보여주세요.', back: '뒷모습을 보여주세요.' } as const;
  const done = photos.front && photos.side && photos.back;
  const capture = () => {
    const shot = isMockMode()
      ? mockPortrait(`customer-${tab}-${Date.now()}`, tab, '현재 머리', tab === 'front' ? '정면 촬영' : tab === 'side' ? '옆모습 촬영' : '뒷모습 촬영')
      : img(`cust${tab}${Date.now() % 997}`, 700);
    set({ photos: { ...photos, [tab]: shot } });
    if (tab === 'front') setTab('side'); else if (tab === 'side') setTab('back');
  };
  return (
    <AppShell>
      <PageHeader title="현재 머리를 세 방향에서 보여주세요." sub="머리 끝까지 프레임에 들어오게 해주세요." step={3} total={TOTAL} />
      <div className="flex gap-2 mb-4">
        {(['front', 'side', 'back'] as const).map((k, i) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 min-h-[48px] rounded-xl border font-bold ${tab === k ? 'bg-ink text-white border-ink' : 'border-line text-secondary'}`}>
            {photos[k] ? '● ' : '○ '}{['앞', '옆', '뒤'][i]}
          </button>
        ))}
      </div>
      <p className="font-bold text-[18px] mb-2">{labels[tab]}</p>
      <div className="relative rounded-3xl overflow-hidden border-2 border-line bg-softBg mb-4">
        {photos[tab]
          ? <img src={photos[tab]!} alt={tab} className="w-full aspect-[4/4.4] object-cover" />
          : (
            <div className="aspect-[4/4.4] flex flex-col items-center justify-center gap-3 p-8">
              <div className="w-44 h-56 rounded-[90px] border-[3px] border-dashed border-primary/60 flex items-center justify-center">
                <span className="text-[44px]">📷</span>
              </div>
              <p className="text-secondary text-[15px]">얼굴 중심에 맞춰주세요 · 머리 윗부분이 잘리지 않게</p>
            </div>
          )}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-[13px] px-4 py-1.5 rounded-full">얼굴과 머리 전체가 보이게</div>
      </div>
      {!photos[tab]
        ? <PrimaryButton onClick={capture}>촬영하기</PrimaryButton>
        : (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => set({ photos: { ...photos, [tab]: null } })}>다시 촬영</SecondaryButton>
            <div className="flex-1">
              {done
                ? <PrimaryButton onClick={() => transitionTo('style', nav)}>다음 · 스타일 고르기</PrimaryButton>
                : <PrimaryButton onClick={capture}>다음 방향 촬영</PrimaryButton>}
            </div>
          </div>
        )}
      <div className="flex gap-2 mt-3"><SecondaryButton onClick={() => transitionTo('intent', nav)}>이전</SecondaryButton></div>
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
        <div className="flex-1"><PrimaryButton onClick={() => transitionTo('generation', nav)}>AI로 3가지 방향 만들기</PrimaryButton></div>
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
  const { presetId, set } = useConsult();
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await requestGeneration(`preset:${presetId}`);
        if (!live) return;
        set({ candidates: res.candidates ?? makeCandidates(presetId ?? 'hair'), step: 'generation' });
        transitionTo('candidates', nav);
      } catch (e) { if (live) setErr(e instanceof Error ? e.message : '생성에 실패했어요. 다시 시도해주세요.'); }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = stepOrder.indexOf('generation');
  void pct;
  return (
    <AppShell>
      <PageHeader title="3가지 방향을 만들고 있어요." sub="앞·옆·뒤가 같은 스타일로 유지돼요." step={6} total={TOTAL} />
      {isMockMode() && <div className="mb-3"><MockBadge /></div>}
      <div className="border border-line rounded-3xl p-10 text-center">
        <div className="h-2 rounded-full bg-line overflow-hidden mb-5"><div className="h-full w-2/5 bg-primary rounded-full ht-progress" /></div>
        <p className="font-bold text-[18px]">{isMockMode() ? '목업 이미지를 준비하는 중…' : 'AI가 헤어를 그리는 중…'}</p>
        <p className="text-secondary mt-1">잠시만 태블릿을 함께 봐주세요.</p>
        {err && <><p className="text-error mt-3">{err}</p><div className="mt-4"><PrimaryButton onClick={() => transitionTo('candidates', nav)}>그래도 보기</PrimaryButton></div></>}
      </div>
    </AppShell>
  );
}
