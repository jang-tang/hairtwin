import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { AppShell, PrimaryButton, SecondaryButton, PageHeader, Chip } from '../components/ui';
import { useAuth, useDash, useUi } from '../stores/baseStores';
import { useConsult } from '../stores/consultationStore';
import { PRESETS, img } from '../data';
import { mockPortrait } from '../mocks/mockImages';

export function LoginPage() {
  const nav = useNavigate();
  const login = useAuth((s) => s.login);
  const [name, setName] = useState('지수 디자이너');
  const start = () => { login(name || undefined); nav('/dashboard'); };
  const shots = [
    { v: 'front' as const, t: '앞모습으로 제안' },
    { v: 'side' as const, t: '옆선까지 확인' },
    { v: 'back' as const, t: '뒷모습까지 합의' }
  ];
  return (
    <div className="min-h-full bg-white">
      {/* 상단 바 */}
      <header className="max-w-[1024px] mx-auto px-5 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-primary text-white font-black flex items-center justify-center text-[18px]">H</span>
          <span className="font-extrabold text-[19px] tracking-tight">Hair Twin</span>
        </div>
        <span className="text-[13px] text-muted tracking-widest font-semibold">SALON CONSULTATION SPACE</span>
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
            <div className="flex gap-2 mt-5 text-[13px] font-semibold">
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
        <div className="grid grid-cols-3 gap-3">
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
        <div className="bg-ink text-white rounded-3xl p-7 sm:p-9 grid sm:grid-cols-[1fr_320px] gap-6 items-center">
          <div>
            <h2 className="text-[24px] font-extrabold">디자이너 로그인</h2>
            <p className="text-white/60 text-[15px] mt-1">태블릿을 켜고 바로 상담을 시작하세요. 비밀번호는 필요 없어요.</p>
            <div className="mt-4 flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
                placeholder="지수 디자이너"
                className="flex-1 min-h-[52px] rounded-2xl px-4 text-[16px] text-ink bg-white outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={start}
                className="min-h-[52px] px-7 rounded-2xl bg-primary hover:bg-primaryDark font-bold text-[16px] transition active:scale-[.98] whitespace-nowrap">
                시작하기
              </button>
            </div>
            <p className="text-white/40 text-[13px] mt-3">데모 환경 · 입력한 이름으로 인사말이 표시됩니다</p>
          </div>
          <div className="hidden sm:block">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-5">
              <p className="text-[14px] text-white/70 leading-relaxed">“이거 어떻게 써요?”라는 질문이 나오지 않는 상담 도구. 화면 자체가 사용법을 알려줍니다.</p>
              <p className="text-primary font-bold text-[14px] mt-3">— Hair Twin UX 원칙</p>
            </div>
          </div>
        </div>
        <p className="text-center text-muted text-[13px] mt-6">Hair Twin · Premium Beauty Tech</p>
      </section>
    </div>
  );
}

export function DashboardPage() {
  const nav = useNavigate();
  const designer = useAuth((s) => s.designer);
  const { customers, records } = useDash();
  const reset = useConsult((s) => s.reset);
  const [q, setQ] = useState('');
  const filtered = customers.filter((c) => c.name.includes(q));
  return (
    <AppShell>
      <section className="bg-primaryPale border border-line rounded-3xl p-6 sm:p-8 mb-6">
        <h1 className="text-[26px] font-bold">안녕하세요, {designer}님.</h1>
        <p className="text-secondary text-[16px] mt-1">오늘도 좋은 상담을 시작해볼까요?</p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <PrimaryButton onClick={() => { reset(); nav('/consultations/new/start'); }}>+ 새 고객 상담</PrimaryButton>
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
  const r = records.find((x) => x.id === recordId);
  if (!r) {
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
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['front', 'side', 'back'] as const).map((k, i) => (
          <div key={k}>
            <img src={r.views[k]} alt="" className="w-full aspect-[3/3.8] object-cover rounded-2xl border border-line" />
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
      <PrimaryButton to="/dashboard">확인</PrimaryButton>
    </AppShell>
  );
}

export function PresetsPage() {
  const my = useConsult((s) => s.myPresets);
  const toast = useUi((s) => s.showToast);
  return (
    <AppShell>
      <PageHeader title="스타일 프리셋" sub="마음에 드는 스타일을 눌러보세요. 미용실 전용으로 관리됩니다." />
      <h3 className="font-bold mb-2">기본 프리셋</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {PRESETS.map((p) => (
          <div key={p.id} className="border border-line rounded-2xl overflow-hidden">
            <img src={img(p.seed, 300)} alt={p.name} className="w-full aspect-square object-cover" />
            <div className="p-3"><p className="font-bold">{p.name}</p><p className="text-[13px] text-muted">{p.desc}</p></div>
          </div>
        ))}
      </div>
      <h3 className="font-bold mb-2">내 프리셋</h3>
      {my.length === 0 ? <EmptyBox msg="나만의 스타일 프리셋을 만들어보세요." cta="프리셋 추가" to="/presets/new" /> : (
        <div className="grid gap-2">{my.map((m) => (
          <div key={m.id} className="border border-primary bg-primarySoft rounded-2xl p-4 flex justify-between">
            <span className="font-bold">{m.name}</span>
            <button className="text-primary font-semibold" onClick={() => toast('프리셋이 적용되었습니다.')}>사용</button>
          </div>
        ))}</div>
      )}
      <div className="mt-4"><SecondaryButton to="/presets/new">+ 프리셋 추가</SecondaryButton></div>
    </AppShell>
  );
}

export function PresetEditPage() {
  const nav = useNavigate();
  const my = useConsult((s) => s.myPresets);
  const set = useConsult((s) => s.set);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('레이어드');
  return (
    <AppShell>
      <PageHeader title="프리셋 만들기" sub="선택과 업로드만으로 끝나요. 긴 설명은 필요 없어요." />
      <label className="font-semibold text-[15px]">프리셋 이름 (선택)</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 시그니처 허쉬"
        className="w-full min-h-[52px] border border-line rounded-2xl px-4 mt-2 mb-4" />
      <p className="font-semibold text-[15px] mb-2">대표 태그 고르기</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {['댄디', '레이어드', '허쉬', '보브', '웨이브'].map((t) => (
          <Chip key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Chip>
        ))}
      </div>
      <PrimaryButton onClick={() => { set({ myPresets: [...my, { id: 'my' + Date.now(), name: name || `나의 ${tag}` }] }); nav('/presets'); }}>
        저장하기
      </PrimaryButton>
    </AppShell>
  );
}
