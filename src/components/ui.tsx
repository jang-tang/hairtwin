import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/baseStores';

export function PrimaryButton({ children, onClick, to, disabled }: { children: React.ReactNode; onClick?: () => void; to?: string; disabled?: boolean }) {
  const cls = `min-h-[52px] px-8 rounded-2xl text-[17px] font-semibold text-white transition active:scale-[.98] flex items-center justify-center gap-2 ${disabled ? 'bg-line text-muted cursor-not-allowed' : 'bg-primary hover:bg-primaryDark shadow-[0_6px_20px_rgba(255,74,93,.3)]'}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button disabled={disabled} onClick={onClick} className={cls}>{children}</button>;
}
export function SecondaryButton({ children, onClick, to }: { children: React.ReactNode; onClick?: () => void; to?: string }) {
  const cls = 'min-h-[52px] px-6 rounded-2xl text-[16px] font-semibold border border-line bg-white text-ink active:bg-softBg flex items-center justify-center min-w-[44px]';
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}
export function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`min-h-[44px] px-5 rounded-full text-[15px] font-medium border transition active:scale-95 ${active ? 'bg-primarySoft border-primary text-primary font-semibold' : 'bg-white border-line text-secondary'}`}>
      {children}
    </button>
  );
}
export function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={`min-h-[48px] px-5 rounded-xl text-[15px] border transition ${value === o ? 'bg-ink text-white border-ink' : 'bg-white border-line text-secondary'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
export function SliderControl({ value, onChange, label, display }: { value: number; onChange: (v: number) => void; label: string; display?: string }) {
  return (
    <div>
      <div className="flex justify-between items-center text-[15px] mb-2"><span className="font-semibold">{label}</span><span className="text-primary font-bold">{display ?? value}</span></div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted whitespace-nowrap">짧게</span>
        <input type="range" min={0} max={100} value={value} style={{ ['--fill' as string]: `${value}%` }}
          onChange={(e) => onChange(Number(e.target.value))}
          className="ht-slider flex-1 h-8" aria-label={label} />
        <span className="text-sm text-muted whitespace-nowrap">길게</span>
      </div>
    </div>
  );
}
export function PageHeader({ title, sub, step, total }: { title: string; sub: string; step?: number; total?: number }) {
  return (
    <div className="mb-5">
      {typeof step === 'number' && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(step / (total ?? 1)) * 100}%` }} />
          </div>
          <span className="text-[13px] text-muted font-medium">{step}/{total}</span>
        </div>
      )}
      <h1 className="text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
      <p className="text-secondary text-[16px] mt-1">{sub}</p>
    </div>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const { designer, logout } = useAuth();
  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-line">
        <div className="max-w-[1024px] mx-auto px-5 h-[64px] flex items-center justify-between">
          <button onClick={() => nav('/dashboard')} className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary text-white font-black flex items-center justify-center text-[18px]">H</span>
            <span className="font-extrabold text-[19px] tracking-tight">Hair Twin</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-secondary hidden sm:block">{designer}</span>
            <button onClick={() => { logout(); nav('/login'); }} className="text-[14px] text-muted border border-line rounded-full px-4 min-h-[36px]">로그아웃</button>
          </div>
        </div>
      </header>
      <main className="max-w-[1024px] mx-auto px-5 py-6 pb-28">{children}</main>
    </div>
  );
}
export function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-ink/80 text-white text-[13px] font-semibold px-3 py-1.5 rounded-full">
      <span className="w-2 h-2 rounded-full bg-primary" />
      목업 미리보기 · API 키 없이 체험 중
    </span>
  );
}
export function Guard({ need, children, fallback }: { need: boolean; children: React.ReactNode; fallback: React.ReactNode }) {
  if (!need) return <>{fallback}</>;
  return <>{children}</>;
}
export function NoConsult() {
  return (
    <div className="text-center py-16">
      <p className="text-[20px] font-bold">진행 중인 상담을 찾을 수 없습니다.</p>
      <p className="text-secondary mt-2">처음부터 다시 시작해주세요.</p>
      <div className="mt-6"><PrimaryButton to="/consultations/new/start">새 상담 시작</PrimaryButton></div>
    </div>
  );
}
