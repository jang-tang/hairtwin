import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { routeMap } from '../../lib/routes';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('designer@hairtwin.local');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(routeMap.dashboard, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">BEAUTY CONSULTATION PLATFORM</p>
        <h1>HAIR TWIN</h1>
        <p className="lead">살롱 상담을 더 명확하게.</p>
        <div className="login-demo-note">
          <strong>데모 로그인</strong>
          <span>기본 입력값으로 바로 로그인할 수 있습니다.</span>
        </div>
        <form onSubmit={submit} className="stack">
          <label>이메일<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required /></label>
          <label>비밀번호<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required /></label>
          <button className="primary wide" type="submit" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </main>
  );
}
