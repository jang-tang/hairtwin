import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { AppShell, PrimaryButton, SecondaryButton, PageHeader, Chip, Segmented } from '../components/ui';
import { useAuth, useDash, useUi } from '../stores/baseStores';
import { useConsult, routeMap } from '../stores/consultationStore';
import { api, getToken } from '../api/server';
import { ReviewSummary } from './flow2';
import type { ConsultationRecord } from '../types';
import type { ImageVersion } from '../../server/src/providers/image/types';
import {
  usePresets, presetSummary, MAX_REF_IMAGES,
  PRESET_CATEGORIES, PRESET_LENGTHS, PRESET_BANGS, PRESET_PERMS, PRESET_COLORS,
} from '../stores/presetStore';
import { PRESETS, img } from '../data';
import { mockPortrait } from '../mocks/mockImages';
import { PreRegistrationCta } from '../components/PreRegistrationCta';

export function LoginPage() {
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const [name, setName] = useState('지수 디자이너');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const start = async () => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await login(name || undefined);
      nav('/dashboard');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '로그인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };
  const shots = [
    { v: 'front' as const, t: '앞모습으로 제안' },
    { v: 'side' as const, t: '옆선까지 확인' },
    { v: 'back' as const, t: '뒷모습까지 합의' }
  ];
  return (
    <div className="min-h-full bg-white">
      {/* 상단 바 */}
      <header className="max-w-[1024px] mx-auto px-5 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-xl bg-primary text-white font-black flex items-center justify-center text-[18px]">H</span>
          <span className="font-extrabold text-[19px] tracking-tight">Hair Twin</span>
        </div>
        <span className="hidden sm:block text-[13px] text-muted tracking-widest font-semibold">SALON CONSULTATION SPACE</span>
      </header>

      {/* 히어로 */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full bg-primaryPale" />
        <div className="pointer-events-none absolute top-40 -left-28 w-[300px] h-[300px] rounded-full bg-primarySoft" />
        <div className="relative max-w-[1024px] mx-auto px-5 pt-8 pb-10 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block text-[13px] font-bold text-primary bg-primarySoft border border-primary/20 rounded-full px-4 py-1.5">
              말로 설명하기 어려운 스타일을, 먼저 보여주세요
            </span>
            <h1 className="text-[34px] sm:text-[42px] leading-[1.15] font-extrabold tracking-tight mt-4">
              같은 스타일을<br />먼저 보고<br />시작하는 상담
            </h1>
            <p className="text-secondary text-[16px] mt-3 leading-relaxed">
              세 방향 촬영 → 스타일 선택 → 직접 끌어 조정까지.<br />
              타이핑 없이, 태블릿 하나로 고객과 같은 결과를 바라보세요.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 text-[13px] font-semibold">
              <span className="bg-ink text-white rounded-full px-4 py-2">타이핑 없음</span>
              <span className="border border-line rounded-full px-4 py-2 text-secondary">앞·옆·뒤 비교</span>
              <span className="border border-line rounded-full px-4 py-2 text-secondary">시술 전 합의</span>
            </div>
          </div>
          {/* 비주얼: 3방향 목업 */}
          <div className="grid grid-cols-3 gap-2.5">
            {shots.map((s) => (
              <div key={s.v} className="rounded-2xl overflow-hidden border border-line bg-white shadow-[0_12px_32px_rgba(24,24,27,.08)]">
                <img src={mockPortrait(`landing-${s.v}`, s.v, s.t)} alt={s.t} className="w-full aspect-[3/3.9] object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3단계 */}
      <section className="max-w-[1024px] mx-auto px-5 pb-8">
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            ['01', '세 방향에서 촬영', '앞·옆·뒤를 담아요'],
            ['02', '눌러서 스타일 선택', '후보 3가지 비교'],
            ['03', '끌어서 직접 조정', '앞머리는 cm 단위로']
          ].map(([n, a, b]) => (
            <div key={n} className="border border-line rounded-2xl p-4 bg-softBg">
              <p className="text-primary font-extrabold text-[15px]">{n}</p>
              <p className="font-bold text-[15px] mt-1">{a}</p>
              <p className="text-muted text-[13px]">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 로그인 카드 */}
      <section className="max-w-[1024px] mx-auto px-5 pb-16">
        <div className="bg-ink text-white rounded-3xl p-6 sm:p-9 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-center">
          <div className="min-w-0">
            <h2 className="text-[24px] font-extrabold">디자이너 로그인</h2>
            <p className="text-white/60 text-[15px] mt-1">태블릿을 켜고 바로 상담을 시작하세요. 비밀번호는 필요 없어요.</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
                placeholder="지수 디자이너"
                className="w-full min-w-0 sm:flex-1 min-h-[52px] rounded-2xl px-4 text-[16px] text-ink bg-white outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={start} disabled={busy}
                className="min-h-[52px] px-7 rounded-2xl bg-primary hover:bg-primaryDark font-bold text-[16px] transition active:scale-[.98] whitespace-nowrap disabled:opacity-60">
                {busy ? '접속 중…' : '시작하기'}
              </button>
            </div>
            {err && <p className="text-warning text-[14px] mt-2">{err}</p>}
            <p className="text-white/40 text-[13px] mt-3">데모 환경 · 입력한 이름으로 인사말이 표시됩니다</p>
          </div>
          <div className="hidden lg:block">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-5">
              <p className="text-[14px] text-white/70 leading-relaxed">“이거 어떻게 써요?”라는 질문이 나오지 않는 상담 도구. 화면 자체가 사용법을 알려줍니다.</p>
              <p className="text-primary font-bold text-[14px] mt-3">— Hair Twin UX 원칙</p>
            </div>
          </div>
        </div>
        <p className="text-center text-muted text-[13px] mt-6">Hair Twin · Premium Beauty Tech</p>
      </section>
      <PreRegistrationCta />
    </div>
  );
}

export function DashboardPage() {
  const nav = useNavigate();
  const designer = useAuth((s) => s.designer);
  const serverMode = useAuth((s) => s.serverMode);
  const { customers, records, status, error, refresh } = useDash();
  const reset = useConsult((s) => s.reset);
  const draft = useConsult();
  const [q, setQ] = useState('');
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = customers.filter((c) => c.name.includes(q));
  return (
    <AppShell>
      <section className="bg-primaryPale border border-line rounded-3xl p-6 sm:p-8 mb-6">
        <h1 className="text-[26px] font-bold">안녕하세요, {designer}님.</h1>
        <p className="text-secondary text-[16px] mt-1">오늘도 좋은 상담을 시작해볼까요?</p>
        {status === 'loading' && <p className="text-secondary text-[14px] mt-2">목록을 불러오는 중…</p>}
        {status === 'offline' && (
          <p className="text-secondary text-[14px] mt-2">서버 없이 오프라인으로 동작 중이에요. {serverMode ? '' : '(이 기기에만 저장됩니다)'}</p>
        )}
        {status === 'error' && (
          <p className="text-error text-[14px] mt-2">{error ?? '목록을 불러오지 못했어요.'} <button className="underline font-semibold" onClick={() => void refresh()}>다시 시도</button></p>
        )}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <PrimaryButton onClick={() => { reset(); nav('/consultations/new/start'); }}>+ 새 고객 상담</PrimaryButton>
          {(draft.sessionId || draft.photos.front) && <SecondaryButton onClick={() => nav(routeMap[draft.step])}>진행 중인 상담 이어가기</SecondaryButton>}
          <SecondaryButton onClick={() => nav('/customers')}>고객 찾기</SecondaryButton>
        </div>
      </section>
      <div className="mb-6">
        <label className="font-bold text-[17px]">고객 검색</label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름으로 검색 (예: 민지)"
          className="mt-2 w-full min-h-[52px] border border-line rounded-2xl px-4 text-[16px]" />
        <div className="grid gap-3 mt-3">
          {filtered.length === 0 && <EmptyBox msg="아직 등록된 고객이 없습니다." cta="새 고객 상담" to="/consultations/new/start" />}
          {filtered.map((c) => (
            <Link key={c.id} to={`/customers/${c.id}`} className="border border-line rounded-2xl p-4 flex items-center justify-between active:bg-softBg">
              <div><p className="font-bold text-[17px]">{c.name}</p><p className="text-secondary text-[14px]">최근 방문 {c.lastVisit ?? '-'} · {c.historyCount}회</p></div>
              <span className="text-primary font-bold">보기 ›</span>
            </Link>
          ))}
        </div>
      </div>
      <h2 className="font-bold text-[18px] mb-1">최근 상담</h2>
      <p className="text-secondary text-[14px] mb-3">눌러서 조정 기록을 다시 볼 수 있어요.</p>
      {records.length === 0 ? (
        <EmptyBox msg="아직 상담 기록이 없습니다." cta="첫 상담 시작" to="/consultations/new/start" />
      ) : (
        <div className="grid gap-3">
          {records.slice(0, 5).map((r) => (
            <Link key={r.id} to={`/records/${r.id}`} className="border border-line rounded-2xl p-4 flex gap-4 items-center active:bg-softBg">
              <img src={r.views.front} alt="" className="w-16 h-20 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-bold">{r.customerName} · {r.styleName}</p>
                <p className="text-secondary text-[14px]">{r.date} · {r.adjustments.slice(0, 2).join(' · ')}</p>
              </div>
              <span className="text-primary font-bold">›</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
export function EmptyBox({ msg, cta, to }: { msg: string; cta: string; to: string }) {
  return (
    <div className="border border-dashed border-line rounded-2xl p-8 text-center bg-softBg">
      <p className="text-secondary">{msg}</p>
      <div className="mt-4 inline-block"><PrimaryButton to={to}>{cta}</PrimaryButton></div>
    </div>
  );
}

export function CustomersPage() {
  const { customers } = useDash();
  const [q, setQ] = useState('');
  const list = customers.filter((c) => c.name.includes(q));
  return (
    <AppShell>
      <PageHeader title="고객을 선택해주세요." sub="기존 고객을 눌러 바로 상담을 이어가세요." />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색"
        className="w-full min-h-[52px] border border-line rounded-2xl px-4 text-[16px] mb-3" />
      <div className="grid gap-3">
        {list.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`} className="border border-line rounded-2xl p-4 flex justify-between items-center min-h-[64px]">
            <div><p className="font-bold text-[17px]">{c.name}</p><p className="text-secondary text-[14px]">{c.phone}</p></div>
            <span className="text-primary font-bold">›</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

export function CustomerDetailPage() {
  const { customers, records } = useDash();
  const { customerId: id } = useParams();
  const c = customers.find((x) => x.id === id);
  const nav = useNavigate();
  const set = useConsult((s) => s.set);
  const reset = useConsult((s) => s.reset);
  if (!c) return <AppShell><p className="font-bold">고객을 찾을 수 없습니다.</p></AppShell>;
  const mine = records.filter((r) => r.customerName === c.name);
  return (
    <AppShell>
      <PageHeader title={`${c.name} 고객님`} sub={`최근 방문 ${c.lastVisit ?? '-'} · 누적 ${c.historyCount}회`} />
      <div className="border border-line rounded-3xl p-6 mb-4">
        <p className="text-secondary">전화번호</p><p className="font-bold text-[18px]">{c.phone ?? '-'}</p>
      </div>
      <div className="mb-5">
        <PrimaryButton onClick={() => { reset(); set({ customerName: c.name, customerType: 'existing', step: 'start' }); nav('/consultations/new/start'); }}>
          이 고객으로 상담 시작
        </PrimaryButton>
      </div>
      <h2 className="font-bold text-[18px] mb-1">이 고객의 상담 기록</h2>
      <p className="text-secondary text-[14px] mb-3">눌러서 조정 내용을 다시 볼 수 있어요.</p>
      {mine.length === 0 ? (
        <p className="text-secondary border border-dashed border-line rounded-2xl p-6 text-center bg-softBg">아직 이 고객의 상담 기록이 없습니다.</p>
      ) : (
        <div className="grid gap-3">
          {mine.map((r) => (
            <Link key={r.id} to={`/records/${r.id}`} className="border border-line rounded-2xl p-4 flex gap-4 items-center active:bg-softBg">
              <img src={r.views.front} alt="" className="w-16 h-20 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-bold">{r.styleName}</p>
                <p className="text-secondary text-[14px]">{r.date} · {r.adjustments.slice(0, 2).join(' · ')}</p>
              </div>
              <span className="text-primary font-bold">›</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export function RecordDetailPage() {
  const { records } = useDash();
  const { recordId } = useParams();
  const [remote, setRemote] = useState<ConsultationRecord>();
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [preview, setPreview] = useState('');
  const [historyError, setHistoryError] = useState('');
  const r = remote ?? records.find((x) => x.id === recordId);
  useEffect(() => {
    let live = true;
    setRemote(undefined); setVersions([]); setPreview(''); setHistoryError('');
    if (recordId && getToken()) void api.records.get(recordId).then(record => {
      if (live) setRemote(record);
    }).catch(e => { if (live) setHistoryError(e instanceof Error ? e.message : '기록을 불러오지 못했어요.'); });
    return () => { live = false; };
  }, [recordId]);
  useEffect(() => {
    let live = true;
    if (r?.sessionId) void api.ai.session(r.sessionId).then(session => {
      if (live) { setVersions(session.versions); setPreview(r.selectedVersionId ?? ''); }
    }).catch(e => { if (live) setHistoryError(e instanceof Error ? e.message : '버전을 불러오지 못했어요.'); });
    return () => { live = false; };
  }, [r?.sessionId]);
  const views = versions.find(v => v.id === preview)?.views ?? r?.views;
  if (!r || !views) {
    return (
      <AppShell>
        <PageHeader title="기록을 찾을 수 없습니다." sub="삭제되었거나 잘못된 주소입니다." />
        <SecondaryButton to="/dashboard">대시보드로 이동</SecondaryButton>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeader title={`${r.customerName} · ${r.styleName}`} sub={`${r.date} 상담 조정 기록`} />
      {historyError && <p role="alert" className="text-error mb-3">{historyError}</p>}
      {versions.length > 0 && <div className="flex flex-wrap gap-2 mb-4">{versions.map(v => <button key={v.id} onClick={() => setPreview(v.id)} className={`min-h-[44px] px-4 rounded-xl border ${preview === v.id ? 'border-primary bg-primarySoft' : 'border-line'}`}>후보 {v.candidateId} · {v.label}{r.selectedVersionId === v.id ? ' · 최종' : ''}</button>)}</div>}
      {versions.find(v => v.id === preview)?.summary && <p className="text-secondary mb-3">{versions.find(v => v.id === preview)?.summary}</p>}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['front', 'side', 'back'] as const).map((k, i) => (
          <div key={k}>
            <img src={views[k]} alt="" className="w-full aspect-[3/3.8] object-cover rounded-2xl border border-line" />
            <p className="text-center text-[13px] text-muted mt-1">{['앞', '옆', '뒤'][i]}</p>
          </div>
        ))}
      </div>
      <div className="border border-line rounded-3xl p-5 mb-3">
        <p className="font-bold mb-2">고객이 원했던 변화</p>
        <p className="text-secondary">{r.intent || '-'}</p>
      </div>
      <div className="border border-line rounded-3xl p-5 mb-3">
        <p className="font-bold mb-2">조정 기록</p>
        <ul className="grid gap-1.5">
          {r.adjustments.map((a) => (
            <li key={a} className="text-[15px] bg-softBg border border-line rounded-xl px-3 py-2">✓ {a}</li>
          ))}
        </ul>
      </div>
      {r.condition && (
        <div className="border border-line rounded-3xl p-5 mb-4">
          <p className="font-bold mb-2">당시 모발 특성</p>
          <p className="text-secondary text-[15px]">
            {r.condition.texture} · {r.condition.damage} · {r.condition.thickness} · 밀도 {r.condition.density}
          </p>
        </div>
      )}
      {r.stylistReview && <ReviewSummary review={r.stylistReview} />}
      <PrimaryButton to="/dashboard">확인</PrimaryButton>
    </AppShell>
  );
}

export function PresetsPage() {
  const nav = useNavigate();
  const presets = usePresets((s) => s.presets);
  const status = usePresets((s) => s.status);
  const presetError = usePresets((s) => s.error);
  const refresh = usePresets((s) => s.refresh);
  const removePreset = usePresets((s) => s.removePreset);
  const toast = useUi((s) => s.showToast);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useEffect(() => { void refresh(); }, [refresh]);
  const doRemove = async (id: string) => {
    try {
      await removePreset(id);
      setConfirmId(null);
      toast('프리셋을 삭제했어요.');
    } catch (e) {
      toast(e instanceof Error ? e.message : '삭제에 실패했어요.');
    }
  };
  return (
    <AppShell>
      <PageHeader title="스타일 프리셋" sub="매장에서 자주 쓰는 스타일을 저장해두고 상담 때 바로 꺼내 쓰세요." />
      <div className="mb-4"><SecondaryButton to="/presets/new">+ 프리셋 등록하기</SecondaryButton></div>
      {status === 'loading' && <p className="text-secondary text-[14px] mb-3">프리셋을 불러오는 중…</p>}
      {status === 'error' && (
        <p className="text-error text-[14px] mb-3">{presetError ?? '프리셋을 불러오지 못했어요.'} <button className="underline font-semibold" onClick={() => void refresh()}>다시 시도</button></p>
      )}

      <h3 className="font-bold mb-2">내 프리셋 {presets.length > 0 && <span className="text-primary">· {presets.length}</span>}</h3>
      {presets.length === 0 ? (
        <div className="mb-6"><EmptyBox msg="등록된 프리셋이 없습니다. 옵션과 참고 사진을 넣어 나만의 프리셋을 만들어보세요." cta="프리셋 등록하기" to="/presets/new" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {presets.map((m) => (
            <div key={m.id} className="border border-primary/40 bg-primarySoft/40 rounded-2xl overflow-hidden">
              <div className="flex gap-3 p-3">
                {m.refImages.length > 0 ? (
                  <img src={m.refImages[0]} alt={m.name} className="w-20 h-24 rounded-xl object-cover border border-line shrink-0" />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-softBg border border-dashed border-line flex items-center justify-center text-[26px] shrink-0">💇</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[17px] truncate">{m.name}</p>
                  <p className="text-[13px] text-secondary truncate">{presetSummary(m)}</p>
                  {m.desc && <p className="text-[13px] text-muted truncate mt-0.5">{m.desc}</p>}
                  {m.refImages.length > 1 && <p className="text-[12px] text-muted mt-0.5">참고 사진 {m.refImages.length}장</p>}
                </div>
              </div>
              {confirmId === m.id ? (
                <div className="px-3 pb-3 flex gap-2">
                  <p className="text-[14px] font-semibold flex-1 self-center">정말 삭제할까요?</p>
                  <button
                    onClick={() => void doRemove(m.id)}
                    className="min-h-[44px] px-4 rounded-xl bg-error text-white text-[14px] font-bold"
                  >
                    삭제
                  </button>
                  <button onClick={() => setConfirmId(null)} className="min-h-[44px] px-4 rounded-xl border border-line text-[14px] font-semibold">취소</button>
                </div>
              ) : (
                <div className="px-3 pb-3 flex gap-2">
                  <button
                    onClick={() => toast(`'${m.name}' 프리셋을 상담에 사용합니다.`)}
                    className="flex-1 min-h-[44px] rounded-xl bg-primary text-white text-[14px] font-bold active:scale-[.98]"
                  >
                    사용
                  </button>
                  <button
                    onClick={() => nav(`/presets/${m.id}/edit`)}
                    className="flex-1 min-h-[44px] rounded-xl border border-line bg-white text-[14px] font-semibold"
                  >
                    수정
                  </button>
                  <button onClick={() => setConfirmId(m.id)} className="min-h-[44px] px-4 rounded-xl border border-line text-error text-[14px] font-semibold">삭제</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="font-bold mb-2">기본 프리셋</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {PRESETS.map((p) => (
          <div key={p.id} className="border border-line rounded-2xl overflow-hidden">
            <img src={img(p.seed, 300)} alt={p.name} className="w-full aspect-square object-cover" />
            <div className="p-3"><p className="font-bold">{p.name}</p><p className="text-[13px] text-muted">{p.desc}</p></div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  return Promise.all(
    list.map(
      (f) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(f);
        })
    )
  );
}

export function PresetEditPage() {
  const nav = useNavigate();
  const { presetId } = useParams();
  const isEdit = Boolean(presetId);
  const existing = usePresets((s) => s.presets.find((x) => x.id === presetId));
  const addPreset = usePresets((s) => s.addPreset);
  const updatePreset = usePresets((s) => s.updatePreset);
  const removePreset = usePresets((s) => s.removePreset);
  const toast = useUi((s) => s.showToast);

  const [name, setName] = useState(existing?.name ?? '');
  const [desc, setDesc] = useState(existing?.desc ?? '');
  const [category, setCategory] = useState(existing?.category ?? '레이어드');
  const [length, setLength] = useState(existing?.length ?? '미디움');
  const [bang, setBang] = useState(existing?.bang ?? '시스루뱅');
  const [perm, setPerm] = useState(existing?.perm ?? '직모');
  const [color, setColor] = useState(existing?.color ?? '염색 없음');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [refImages, setRefImages] = useState<string[]>(existing?.refImages ?? []);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isEdit && !existing) nav('/presets');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remain = MAX_REF_IMAGES - refImages.length;
    if (remain <= 0) {
      toast(`참고 사진은 최대 ${MAX_REF_IMAGES}장까지 첨부할 수 있어요.`);
      return;
    }
    setBusy(true);
    try {
      const urls = await readFilesAsDataUrls(Array.from(files).slice(0, remain));
      setRefImages((prev) => [...prev, ...urls].slice(0, MAX_REF_IMAGES));
      if (files.length > remain) toast(`최대 ${MAX_REF_IMAGES}장까지만 추가했어요.`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast('프리셋 이름을 입력해주세요.');
      return;
    }
    const payload = {
      name: name.trim(),
      desc: desc.trim(),
      category, length, bang, perm, color,
      memo: memo.trim(),
      refImages,
    };
    try {
      if (isEdit && existing) {
        await updatePreset(existing.id, payload);
        toast('프리셋을 수정했어요.');
      } else {
        await addPreset(payload);
        toast('프리셋을 등록했어요.');
      }
      nav('/presets');
    } catch (e) {
      toast(e instanceof Error ? e.message : '저장에 실패했어요.');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={isEdit ? '프리셋 수정하기' : '프리셋 등록하기'}
        sub="옵션을 고르고 참고 사진을 첨부하면 상담 때 바로 꺼내 쓸 수 있어요."
      />

      <div className="border border-line rounded-3xl p-5 mb-4">
        <label className="font-bold text-[16px]">프리셋 이름 <span className="text-error">*</span></label>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 시그니처 허쉬"
          className="w-full min-h-[52px] border border-line rounded-2xl px-4 mt-2" maxLength={30}
        />
        <label className="font-bold text-[16px] block mt-4">한 줄 설명</label>
        <input
          value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="예: 가볍고 자연스러운 옆라인"
          className="w-full min-h-[52px] border border-line rounded-2xl px-4 mt-2" maxLength={60}
        />
      </div>

      <div className="border border-line rounded-3xl p-5 mb-4">
        <p className="font-bold text-[16px] mb-2">대표 스타일</p>
        <div className="flex gap-2 flex-wrap">
          {PRESET_CATEGORIES.map((t) => (
            <Chip key={t} active={category === t} onClick={() => setCategory(t)}>{t}</Chip>
          ))}
        </div>
      </div>

      <div className="border border-line rounded-3xl p-5 mb-4 grid gap-4">
        <div>
          <p className="font-bold text-[16px] mb-2">기장</p>
          <Segmented options={PRESET_LENGTHS} value={length} onChange={setLength} />
        </div>
        <div>
          <p className="font-bold text-[16px] mb-2">앞머리</p>
          <Segmented options={PRESET_BANGS} value={bang} onChange={setBang} />
        </div>
        <div>
          <p className="font-bold text-[16px] mb-2">펌·볼륨</p>
          <Segmented options={PRESET_PERMS} value={perm} onChange={setPerm} />
        </div>
        <div>
          <p className="font-bold text-[16px] mb-2">컬러</p>
          <Segmented options={PRESET_COLORS} value={color} onChange={setColor} />
        </div>
      </div>

      <div className="border border-line rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-[16px]">참고 사진 <span className="text-muted font-normal text-[14px]">({refImages.length}/{MAX_REF_IMAGES})</span></p>
          <label className={`text-[14px] font-bold rounded-full px-4 min-h-[40px] inline-flex items-center cursor-pointer ${busy ? 'bg-line text-muted' : 'bg-ink text-white'}`}>
            {busy ? '불러오는 중…' : '+ 사진 첨부'}
            <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
        <p className="text-secondary text-[14px] mb-3">완성 사진이나 원하는 분위기의 사진을 첨부해주세요. 상담 화면에서 함께 볼 수 있어요.</p>
        {refImages.length === 0 ? (
          <div className="border border-dashed border-line rounded-2xl p-6 text-center text-secondary bg-softBg text-[14px]">
            아직 첨부된 사진이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {refImages.map((src, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden border border-line">
                <img src={src} alt={`참고 ${i + 1}`} className="w-full aspect-square object-cover" />
                <button
                  onClick={() => setRefImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/70 text-white text-[16px] font-bold"
                  aria-label={`참고 사진 ${i + 1} 삭제`}
                >
                  ×
                </button>
                {i === 0 && <span className="absolute bottom-1.5 left-1.5 bg-primary text-white text-[12px] font-bold px-2 py-0.5 rounded-full">대표</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-line rounded-3xl p-5 mb-5">
        <label className="font-bold text-[16px]">시술 메모 <span className="text-muted font-normal">(선택)</span></label>
        <textarea
          value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 옆머리 다운펌 10분 · 앞머리 눈썹선 기준"
          className="w-full min-h-[88px] border border-line rounded-2xl px-4 py-3 mt-2 text-[15px]" maxLength={300}
        />
      </div>

      <div className="grid gap-2">
        <PrimaryButton onClick={save}>{isEdit ? '수정 완료' : '프리셋 등록'}</PrimaryButton>
        <SecondaryButton onClick={() => nav('/presets')}>취소</SecondaryButton>
        {isEdit && existing && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button onClick={() => {
                void (async () => {
                  try {
                    await removePreset(existing.id);
                    toast('프리셋을 삭제했어요.');
                    nav('/presets');
                  } catch (e) {
                    toast(e instanceof Error ? e.message : '삭제에 실패했어요.');
                  }
                })();
              }}
                className="flex-1 min-h-[52px] rounded-2xl bg-error text-white font-bold">
                정말 삭제하기
              </button>
              <div className="flex-1"><SecondaryButton onClick={() => setConfirmDelete(false)}>돌아가기</SecondaryButton></div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="min-h-[52px] rounded-2xl text-error font-semibold text-[15px]">
              이 프리셋 삭제하기
            </button>
          )
        )}
      </div>
    </AppShell>
  );
}
