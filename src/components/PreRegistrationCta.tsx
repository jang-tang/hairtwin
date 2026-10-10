import { Link } from 'react-router-dom';

export function PreRegistrationCta() {
  return (
    <footer className="border-t border-line bg-primaryPale">
      <div className="max-w-[1024px] mx-auto px-5 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <p className="text-[20px] font-bold tracking-tight">Hair Twin을 우리 매장에서도</p>
          <p className="mt-1 text-[15px] text-secondary">사전 예약하고 정식 출시 소식을 이메일로 받아보세요.</p>
        </div>
        <Link to="/pre-register" className="min-h-[52px] px-7 rounded-2xl bg-primary hover:bg-primaryDark text-white font-semibold flex items-center justify-center gap-4 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          사전 예약하기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </footer>
  );
}
