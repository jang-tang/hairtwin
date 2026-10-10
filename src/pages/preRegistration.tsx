import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/server';
import { useAuth } from '../stores/baseStores';

const inputStyle = 'mt-2 w-full min-h-[52px] rounded-xl border border-line bg-white px-4 text-[16px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-softBg';

export function PreRegistrationPage() {
  const loggedIn = useAuth(state => state.loggedIn);
  const returnTo = loggedIn ? '/dashboard' : '/login';
  const [values, setValues] = useState({ salonName: '', email: '', contactName: '', region: '', website: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = '사전 예약 · Hair Twin';
    window.scrollTo(0, 0);
    return () => { document.title = previous; };
  }, []);
  useEffect(() => { if (done || error) feedback.current?.focus(); }, [done, error]);

  const change = (key: keyof typeof values, value: string) => {
    setValues(previous => ({ ...previous, [key]: value })); setError('');
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await api.preRegistrations.create({ ...values, consent });
      setDone(true);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.code === 'CONNECTION_FAILED'
        ? '서버에 연결하지 못해 신청이 접수되지 않았어요. 입력 내용은 유지됩니다. 잠시 후 다시 신청해주세요.'
        : cause instanceof Error ? cause.message : '신청을 접수하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally { submitting.current = false; setBusy(false); }
  };

  return (
    <div className="min-h-full bg-softBg">
      <header className="bg-white border-b border-line">
        <div className="max-w-[1024px] mx-auto px-5 h-[72px] flex items-center justify-between gap-4">
          <Link to={returnTo} className="flex items-center gap-2 min-h-[44px] shrink-0 font-extrabold text-[19px] tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center" aria-hidden="true">H</span>Hair Twin
          </Link>
          <Link to={returnTo} className="min-h-[44px] flex items-center text-[14px] font-semibold text-secondary hover:text-ink"><span className="sm:hidden">돌아가기</span><span className="hidden sm:inline">체험으로 돌아가기</span> <span className="ml-2" aria-hidden="true">↗</span></Link>
        </div>
      </header>
      <main className="max-w-[1024px] mx-auto px-5 py-10 sm:py-16 grid lg:grid-cols-[.9fr_1.1fr] gap-10 lg:gap-16 items-start">
        <section className="lg:sticky lg:top-12">
          <h1 className="text-[34px] sm:text-[42px] leading-[1.2] font-extrabold tracking-tight">우리 매장에<br /><span className="text-primary">Hair Twin</span>을 먼저.</h1>
          <p className="mt-5 text-[17px] leading-relaxed text-secondary">고객과 같은 스타일을 바라보는 상담.<br />정식 서비스가 준비되면 알려드릴게요.</p>
          <div className="mt-8 border-t border-line pt-6 space-y-5">
            <div><h2 className="font-semibold">출시 소식을 이메일로</h2><p className="text-[14px] text-secondary mt-1">입력하신 이메일로 정식 출시와 이용 방법을 안내합니다.</p></div>
            <div><h2 className="font-semibold">부담 없이 관심을 남겨주세요</h2><p className="text-[14px] text-secondary mt-1">결제 없이 신청하며, 구매 의무가 생기지 않습니다.</p></div>
          </div>
          <p className="mt-8 text-[13px] text-secondary">현재는 사전 예약 단계이며 출시 일정과 요금은 확정 후 안내합니다.</p>
        </section>

        <section className="min-w-0 bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(24,24,27,.04)]" aria-labelledby="registration-heading">
          {done ? (
            <div ref={feedback} tabIndex={-1} role="status" className="py-8 text-center outline-none ht-fade">
              <div className="w-16 h-16 rounded-full bg-primarySoft text-primary text-[30px] mx-auto flex items-center justify-center" aria-hidden="true">✓</div>
              <h2 id="registration-heading" className="mt-6 text-[26px] font-bold tracking-tight">사전 예약이 완료됐어요</h2>
              <p className="mt-3 text-secondary leading-relaxed"><strong className="text-ink break-all">{values.email.trim()}</strong>로<br />출시 소식과 이용 안내를 전해드릴게요.</p>
              <p className="mt-4 text-[14px] text-secondary">지금 체험을 계속 둘러보셔도 좋아요.</p>
              <Link to={returnTo} className="mt-8 min-h-[52px] px-6 rounded-2xl bg-primary hover:bg-primaryDark text-white font-semibold flex items-center justify-center">체험으로 돌아가기</Link>
            </div>
          ) : (
            <>
              <h2 id="registration-heading" className="text-[24px] font-bold tracking-tight">사전 예약 신청</h2>
              <p className="mt-2 text-[14px] text-secondary">미용실 이름과 안내받을 이메일을 남겨주세요.</p>
              <form onSubmit={submit} className="mt-7" aria-busy={busy}>
                {error && <div ref={feedback} tabIndex={-1} role="alert" className="mb-5 rounded-xl border border-error/30 bg-primaryPale p-4 text-[14px] text-error outline-none">{error}</div>}
                <fieldset disabled={busy} className="min-w-0 space-y-5">
                  <legend className="sr-only">사전 예약 정보</legend>
                  <label className="block text-[15px] font-semibold" htmlFor="salon-name">미용실 이름 <span className="text-primary text-[13px]">필수</span>
                    <input id="salon-name" name="salonName" autoComplete="organization" required maxLength={100} placeholder="예: 헤어트윈 살롱" value={values.salonName} onChange={e => change('salonName', e.target.value)} className={inputStyle} />
                  </label>
                  <label className="block text-[15px] font-semibold" htmlFor="reservation-email">이메일 <span className="text-primary text-[13px]">필수</span>
                    <input id="reservation-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="salon@example.com" value={values.email} onChange={e => change('email', e.target.value)} className={inputStyle} />
                  </label>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <label className="block text-[15px] font-semibold" htmlFor="contact-name">담당자 이름 <span className="text-secondary text-[13px] font-normal">선택</span>
                      <input id="contact-name" name="contactName" autoComplete="name" maxLength={50} placeholder="담당자 성함" value={values.contactName} onChange={e => change('contactName', e.target.value)} className={inputStyle} />
                    </label>
                    <label className="block text-[15px] font-semibold" htmlFor="salon-region">매장 지역 <span className="text-secondary text-[13px] font-normal">선택</span>
                      <input id="salon-region" name="region" autoComplete="address-level2" maxLength={100} placeholder="예: 서울 마포구" value={values.region} onChange={e => change('region', e.target.value)} className={inputStyle} />
                    </label>
                  </div>
                  <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={e => change('website', e.target.value)} /></label></div>
                  <div className="border-t border-line pt-5">
                    <label htmlFor="registration-consent" className="flex items-start gap-3 cursor-pointer min-h-[44px] text-[14px] font-semibold">
                      <input id="registration-consent" type="checkbox" required checked={consent} onChange={e => { setConsent(e.target.checked); setError(''); }} aria-describedby="consent-details" className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
                      개인정보 수집·이용에 동의합니다. (필수)
                    </label>
                    <p id="consent-details" className="text-[12px] leading-relaxed text-secondary">미용실명·이메일 및 입력한 담당자명·지역을 사전 예약 접수와 출시 안내를 위해 수집합니다. 신청일로부터 1년간 보관 후 삭제합니다. 동의를 거부할 수 있으며, 거부 시 사전 예약 신청이 제한됩니다.</p>
                  </div>
                  <button type="submit" className="w-full min-h-[54px] rounded-2xl bg-primary hover:bg-primaryDark text-white font-bold text-[17px] transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{busy ? '신청 접수 중…' : '사전 예약 신청하기'}</button>
                </fieldset>
                <p className="mt-3 text-center text-[12px] text-secondary">사전 예약은 무료이며, 결제 정보를 요청하지 않습니다.</p>
              </form>
            </>
          )}
        </section>
      </main>
      <footer className="max-w-[1024px] mx-auto px-5 pb-8 text-[12px] text-secondary">Hair Twin · 고객과 같은 스타일을 바라보는 상담</footer>
    </div>
  );
}
