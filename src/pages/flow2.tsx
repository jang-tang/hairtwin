import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, PrimaryButton, SecondaryButton, PageHeader, Chip, SliderControl, NoConsult, Guard, MockBadge } from '../components/ui';
import { DraggableRegion } from '../components/viewers';
import { useConsult, transitionTo, setRegionType, appendEditedVersion } from '../stores/consultationStore';
import { useDash, useUi } from '../stores/baseStores';
import { REGION_LABEL, QUICK_OPTIONS, type RegionType } from '../types';
import { bangLabel, sideLabel, BANG_QUICK, SIDE_QUICK, FRINGE_LINE_COLOR, SIDE_LINE_COLOR } from '../data';
import { requestEdit } from '../api/aiClient';

// 영역 선택 → 보여줄 목업 방향 (앞머리=앞, 옆머리=옆, 뒷머리=뒤)
const REGION_VIEW: Record<RegionType, 'front' | 'side' | 'back'> = {
  fringe: 'front', side: 'side', crown: 'front', back: 'back', all: 'front'
};
const VIEW_KO = { front: '앞모습', side: '옆모습', back: '뒷모습' } as const;

export function CandidatesPage() {
  const nav = useNavigate();
  const { candidates, selectedCandidate, selectCandidate, viewTab, aiMock } = useConsult();
  const list = candidates.length ? candidates : [];
  return (
    <AppShell>
      <Guard need={list.length > 0} fallback={<NoConsult />}>
        <PageHeader title="이 중 가장 마음에 드는 방향을 골라주세요." sub="각 후보의 앞·옆·뒤를 크게 볼 수 있어요." step={7} total={10} />
        {aiMock && <div className="mb-3"><MockBadge /></div>}
        <div className="grid gap-5">
          {list.map((cd) => (
            <button key={cd.id} onClick={() => selectCandidate(cd.id)}
              className={`text-left rounded-3xl border-[3px] overflow-hidden transition ${selectedCandidate === cd.id ? 'border-primary shadow-[0_10px_30px_rgba(255,74,93,.22)]' : 'border-line'}`}>
              <div className="p-4 flex items-center justify-between">
                <div><p className="font-extrabold text-[19px]">후보 {cd.id} · {cd.name}</p><p className="text-secondary text-[14px]">{cd.desc}</p></div>
                {selectedCandidate === cd.id && <span className="bg-primary text-white text-[13px] font-bold px-3 py-1.5 rounded-full">선택됨</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                {(['front', 'side', 'back'] as const).map((v, i) => (
                  <div key={v}><img src={cd.views[v]} alt="" className="w-full aspect-[3/3.6] object-cover rounded-xl" />
                    <p className="text-center text-[13px] text-muted mt-1">{['앞', '옆', '뒤'][i]}</p></div>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <SecondaryButton onClick={() => transitionTo('condition', nav)}>이전</SecondaryButton>
          <div className="flex-1"><PrimaryButton disabled={!selectedCandidate} onClick={() => transitionTo('feedback', nav)}>이 방향으로 다듬기</PrimaryButton></div>
        </div>
        <p className="hidden">{viewTab}</p>
      </Guard>
    </AppShell>
  );
}

export function FeedbackPage() {
  const nav = useNavigate();
  const { candidates, selectedCandidate, region, set, bang, sideLength, quickEdits, freeText, versions, chosenVersion, sessionId, condition, sideHair, aiMock } = useConsult();
  const toast = useUi((s) => s.showToast);
  const cd = candidates.find((c) => c.id === selectedCandidate) ?? candidates[0];
  const [busy, setBusy] = useState(false);
  const base = versions.find(v => v.id === chosenVersion);
  const applying = useRef(false);
  if (!cd || !base || !sessionId) return <AppShell><NoConsult /></AppShell>;
  const apply = async () => {
    if (applying.current) return;
    applying.current = true; setBusy(true);
    try {
      const r = await requestEdit({
        requestId: crypto.randomUUID(), sessionId, baseVersionId: base.id,
        view: REGION_VIEW[region?.type ?? 'all'], region, bang, sideLength, condition, sideHair,
        feedback: quickEdits, freeText,
      });
      if (useConsult.getState().sessionId !== sessionId) return;
      appendEditedVersion(r.version);
      toast(r.mock ? '목업 편집 결과를 저장했어요.' : '편집 결과를 새 버전으로 저장했어요.');
      transitionTo('interpretation', nav);
    } catch (e) {
      toast(e instanceof Error ? e.message : '적용에 실패했어요.');
    } finally {
      applying.current = false;
      setBusy(false);
    }
  };
  // 영역에 해당하는 목업 한 장만 표시 (앞머리→앞, 옆머리→옆, 뒷머리→뒤)
  const shownView = REGION_VIEW[region?.type ?? 'fringe'];
  const singleSelect = region?.type === 'side'; // 옆머리 옵션은 하나만 선택
  const toggleQuick = (o: string) => {
    if (singleSelect) {
      set({ quickEdits: quickEdits.includes(o) ? [] : [o] });
    } else {
      set({ quickEdits: quickEdits.includes(o) ? quickEdits.filter((x) => x !== o) : [...quickEdits, o] });
    }
  };
  return (
    <AppShell>
      <PageHeader title="여기서 조금 바꾸고 싶은 부분이 있나요?" sub={`${base.label}에서 편집해요. 사각형 안의 머리만 변경하고 다른 방향도 함께 맞춰요.`} step={8} total={10} />
      {aiMock && <div className="mb-3"><MockBadge /></div>}
      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-4">
        <div>
          {region && (
            <DraggableRegion
              image={base.views[shownView]} region={region} onChange={(r) => set({ region: r })}
              guides={[
                { key: 'fringe', y: bang, color: FRINGE_LINE_COLOR, title: '앞머리', display: bangLabel(bang), onChange: (v) => set({ bang: v }) },
                { key: 'side', y: sideLength ?? 50, color: SIDE_LINE_COLOR, title: '옆머리', display: sideLabel(sideLength ?? 50), onChange: (v) => set({ sideLength: v }) },
              ]}
            />
          )}
          <div className="flex gap-2 justify-center mt-3 text-[13px] font-semibold">
            <span className="inline-flex items-center gap-1.5 border border-line rounded-full px-3 py-1.5">
              <span className="w-4 h-1 rounded-full" style={{ backgroundColor: FRINGE_LINE_COLOR }} /> 앞머리 · {bangLabel(bang)}
            </span>
            <span className="inline-flex items-center gap-1.5 border border-line rounded-full px-3 py-1.5">
              <span className="w-4 h-1 rounded-full" style={{ backgroundColor: SIDE_LINE_COLOR }} /> 옆머리 · {sideLabel(sideLength ?? 50)}
            </span>
          </div>
          <p className="text-center text-[14px] text-secondary mt-2">
            {VIEW_KO[shownView]}에서 {region ? REGION_LABEL[region.type] : ''} 조정 중 · 선을 위·아래로 끌면 cm 단위로 바뀝니다
          </p>
        </div>
        <div className="grid gap-4 content-start">
          <div className="border border-line rounded-3xl p-4">
            <p className="font-bold mb-2">영역 선택</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(REGION_LABEL) as RegionType[]).map((t) => (
                <Chip key={t} active={region?.type === t} onClick={() => { setRegionType(t); set({ quickEdits: [] }); }}>{REGION_LABEL[t]}</Chip>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-3xl p-4">
            <p className="font-bold mb-2">빠른 조정 · {region ? REGION_LABEL[region.type] : ''}</p>
            {singleSelect && <p className="text-[13px] text-muted mb-2">하나만 고를 수 있어요. 다른 걸 누르면 이전 선택은 꺼집니다.</p>}
            <div className="flex gap-2 flex-wrap">
              {(QUICK_OPTIONS[region?.type ?? 'fringe']).map((o) => (
                <Chip key={o} active={quickEdits.includes(o)} onClick={() => toggleQuick(o)}>{o}</Chip>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-3xl p-4 grid gap-4">
            <div>
              <SliderControl label="앞머리 길이" display={bangLabel(bang)} value={bang} onChange={(v) => set({ bang: v })} color={FRINGE_LINE_COLOR} />
              <div className="flex gap-2 flex-wrap mt-2">
                {BANG_QUICK.map((b) => (
                  <Chip key={b.label} active={Math.abs(bang - b.v) < 8} onClick={() => set({ bang: b.v })}>{b.label}</Chip>
                ))}
              </div>
            </div>
            <div className="border-t border-line pt-4">
              <SliderControl label="옆머리 길이" display={sideLabel(sideLength ?? 50)} value={sideLength ?? 50} onChange={(v) => set({ sideLength: v })} color={SIDE_LINE_COLOR} />
              <div className="flex gap-2 flex-wrap mt-2">
                {SIDE_QUICK.map((b) => (
                  <Chip key={b.label} active={Math.abs((sideLength ?? 50) - b.v) < 8} onClick={() => set({ sideLength: b.v })}>{b.label}</Chip>
                ))}
              </div>
            </div>
            <p className="text-[13px] text-muted">사진 위 가로선과 여기 슬라이더는 함께 움직여요. 둘 중 편한 쪽으로 조정하세요.</p>
          </div>
          <div className="border border-line rounded-3xl p-4">
            <p className="font-bold mb-2">고객 한마디 <span className="text-muted font-normal">(선택)</span></p>
            <input value={freeText} onChange={(e) => set({ freeText: e.target.value })}
              maxLength={500} placeholder="예: 앞머리는 눈썹 아래 2cm로 가볍게" className="w-full min-h-[52px] border border-line rounded-2xl px-4" />
          </div>
          <PrimaryButton disabled={busy} onClick={apply}>{busy ? '적용 중…' : '이대로 적용'}</PrimaryButton>
          <SecondaryButton onClick={() => transitionTo('comparison', nav)}>바꾸고 싶은 곳 없어요 · 그대로 진행</SecondaryButton>
          <SecondaryButton onClick={() => transitionTo('candidates', nav)}>다른 후보 보기</SecondaryButton>
        </div>
      </div>
    </AppShell>
  );
}

export function InterpretationPage() {
  const nav = useNavigate();
  const { bang, sideLength, quickEdits, sideHair, freeText, summary } = useConsult();
  const cards = [
    `앞머리 · ${bangLabel(bang)}`,
    `옆머리 · ${sideLabel(sideLength ?? 50)} (${sideHair})`,
    ...(quickEdits.slice(0, 3).map((q) => `요청 · ${q}`)),
  ];
  return (
    <AppShell>
      <PageHeader title="요청한 내용을 반영했어요." sub={summary || '저장된 편집 결과를 비교해주세요.'} step={8} total={10} />
      <div className="grid gap-3 mb-4">
        {cards.map((c) => (
          <div key={c} className="border border-primary bg-primarySoft rounded-2xl p-4 font-bold text-[16px]">✓ {c}</div>
        ))}
        {freeText && <div className="border border-line rounded-2xl p-4 text-secondary">“{freeText}”</div>}
      </div>
      <div className="flex gap-2">
        <SecondaryButton onClick={() => transitionTo('feedback', nav)}>수정하기</SecondaryButton>
        <div className="flex-1"><PrimaryButton onClick={() => transitionTo('comparison', nav)}>결과 비교</PrimaryButton></div>
      </div>
    </AppShell>
  );
}

export function ComparisonPage() {
  const nav = useNavigate();
  const { versions, selectedCandidate, chosenVersion, chooseVersion, viewTab, set, aiMock } = useConsult();
  const list = versions.filter(v => v.candidateId === selectedCandidate);
  if (!list.length) return <AppShell><NoConsult /></AppShell>;
  return (
    <AppShell>
      <PageHeader title="이미지 버전을 비교해주세요." sub="이전 버전도 선택할 수 있어요. 선택한 버전에서 다시 편집할 수 있습니다." step={9} total={10} />
      {aiMock && <div className="mb-3"><MockBadge /></div>}
      <div className="flex gap-2 mb-3">{(['front','side','back'] as const).map((t,i) => (
        <button key={t} onClick={() => set({ viewTab: t })} className={`flex-1 min-h-[48px] rounded-xl border font-bold ${viewTab === t ? 'bg-ink text-white' : 'border-line'}`}>{['앞','옆','뒤'][i]}</button>
      ))}</div>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        {list.map(v => (
          <button key={v.id} onClick={() => chooseVersion(v.id)} className={`rounded-3xl border-[3px] overflow-hidden text-left ${chosenVersion === v.id ? 'border-primary' : 'border-line'}`}>
            <p className="p-3 font-extrabold">{v.label} {chosenVersion === v.id ? '· 선택됨' : ''}</p>
            <img src={v.views[viewTab]} alt={v.label} className="w-full aspect-square object-contain bg-softBg" />
            <p className="p-3 text-[14px] text-secondary">{v.summary}</p>
            <div className="grid grid-cols-3 gap-1 p-2">{(['front','side','back'] as const).map(k => <img key={k} src={v.views[k]} alt={k} className="w-full aspect-square object-contain rounded-lg" />)}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        <PrimaryButton onClick={() => transitionTo('finalize', nav)}>이대로 진행할게요 ({list.find(v => v.id === chosenVersion)?.label ?? '버전'} 선택됨)</PrimaryButton>
        <SecondaryButton onClick={() => transitionTo('feedback', nav)}>선택한 버전에서 더 수정하기</SecondaryButton>
        <SecondaryButton onClick={() => transitionTo('candidates', nav)}>다른 후보 보기</SecondaryButton>
      </div>
    </AppShell>
  );
}

export function FinalizePage() {
  const nav = useNavigate();
  const { versions, chosenVersion, candidates, selectedCandidate, bang, sideLength, sideHair, quickEdits, stylist, viewTab, set } = useConsult();
  const v = versions.find((x) => x.id === chosenVersion) ?? versions[0];
  const cd = candidates.find((c) => c.id === selectedCandidate);
  if (!v) return <AppShell><NoConsult /></AppShell>;
  return (
    <AppShell>
      <PageHeader title="오늘 결정한 스타일" sub="고객과 화면을 함께 보며 확인해주세요." step={10} total={10} />
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['front', 'side', 'back'] as const).map((k, i) => (
          <div key={k}><img src={v.views[k]} alt="" className="w-full aspect-[3/3.8] object-cover rounded-2xl border border-line" />
            <p className="text-center text-[13px] text-muted mt-1">{['앞', '옆', '뒤'][i]}</p></div>
        ))}
      </div>
      <div className="border border-line rounded-3xl p-5 mb-4">
        <p className="font-extrabold text-[20px]">{cd?.name ?? '소프트 레이어드'}</p>
        <ul className="mt-2 text-[15px] grid gap-1">
          <li>앞머리 · {bangLabel(bang)}</li>
          <li>옆머리 · {sideLabel(sideLength ?? 50)} · {stylist.sideControl} ({sideHair})</li>
          <li>전체 · {quickEdits[0] ?? '가벼운 느낌'}</li>
        </ul>
      </div>
      <div className="flex gap-2 mb-3">
        {(['front', 'side', 'back'] as const).map((t, i) => (
          <button key={t} onClick={() => set({ viewTab: t })}
            className={`flex-1 min-h-[44px] rounded-xl border ${viewTab === t ? 'bg-primarySoft border-primary text-primary font-bold' : 'border-line'}`}>{['앞', '옆', '뒤'][i]}</button>
        ))}
      </div>
      <PrimaryButton onClick={() => transitionTo('report', nav)}>이 방향으로 상담 완료</PrimaryButton>
    </AppShell>
  );
}

export function ReportPage() {
  const nav = useNavigate();
  const st = useConsult();
  const { addRecord, addCustomer, customers } = useDash();
  const toast = useUi((s) => s.showToast);
  const v = st.versions.find((x) => x.id === st.chosenVersion);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  if (!v) return <AppShell><NoConsult /></AppShell>;
  const done = async () => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    const rec = {
      id: 'r' + Date.now(), customerName: st.customerName, date: new Date().toISOString().slice(0, 10),
      styleName: st.candidates.find((c) => c.id === st.selectedCandidate)?.name ?? '소프트 레이어드',
      views: v.views, intent: st.intent,
      adjustments: [`앞머리 ${bangLabel(st.bang)}`, `옆머리 ${sideLabel(st.sideLength ?? 50)}`, st.sideHair, ...st.quickEdits, ...st.stylist.notes],
      condition: v.settings.condition,
      sessionId: st.sessionId ?? undefined, selectedVersionId: v.id,
    };
    try {
      if (!customers.some((c) => c.name === st.customerName)) {
        await addCustomer({ id: 'c' + Date.now(), name: st.customerName, phone: st.customerPhone, lastVisit: rec.date, historyCount: 1 });
      }
      await addRecord(rec);
    } catch (e) {
      savingRef.current = false; setSaving(false);
      toast(e instanceof Error ? e.message : '저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    st.reset();
    nav('/dashboard');
  };
  return (
    <AppShell>
      <PageHeader title="상담 리포트" sub="오늘 합의한 내용이 고객 히스토리에 저장돼요." />
      <div className="border border-line rounded-3xl overflow-hidden mb-4">
        <img src={v.views.front} alt="" className="w-full aspect-[16/10] object-cover" />
        <div className="p-5">
          <p className="font-extrabold text-[19px]">{st.customerName} · {new Date().toISOString().slice(0, 10)}</p>
          <p className="text-secondary text-[15px] mt-1">희망: {st.intent}</p>
          <p className="text-secondary text-[15px]">모발: {st.condition.texture} · {st.condition.damage} · {st.condition.thickness}</p>
          <p className="text-secondary text-[15px]">메모: {st.stylist.notes.join(', ') || st.stylist.memo || '-'}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <img src={v.views.front} alt="앞" className="rounded-xl aspect-square object-cover" />
            <img src={v.views.side} alt="옆" className="rounded-xl aspect-square object-cover" />
            <img src={v.views.back} alt="뒤" className="rounded-xl aspect-square object-cover" />
          </div>
        </div>
      </div>
      <PrimaryButton disabled={saving} onClick={done}>{saving ? '상담 저장 중…' : '상담 저장하고 대시보드로'}</PrimaryButton>
    </AppShell>
  );
}
