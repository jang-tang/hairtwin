import { PrimaryButton, SecondaryButton } from './ui';
import type { AiJob } from '../../server/src/providers/image/types';

const viewLabel = { front: '앞', side: '옆', back: '뒤' };
const statusLabel = { pending: '대기', running: '생성 중', completed: '완료', failed: '실패' };
export function AiJobProgress({ job, error, sending, onCancel, onRetry }: {
  job?: AiJob; error?: string; sending: boolean; onCancel: () => void; onRetry: () => void;
}) {
  const active = !job || ['queued', 'running'].includes(job.status);
  return <section className="border border-line rounded-3xl p-5 grid gap-4" aria-label="이미지 작업 진행 상황">
    <div>
      <p className="font-bold" role="status">{job?.status === 'cancelled' ? '작업을 취소했어요.' : job?.status === 'failed' ? '일부 이미지 생성에 실패했어요.' : job?.status === 'completed' ? '이미지를 모두 저장했어요.' : '이미지를 생성하고 있어요.'}</p>
      <p className="text-secondary text-sm">{job ? `${job.completed}/${job.total}장 완료 · ${job.progress}%` : '작업을 준비하는 중…'}</p>
    </div>
    <div role="progressbar" aria-label="이미지 생성 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job?.progress ?? 0} className="h-2 rounded-full bg-line overflow-hidden">
      <div className="h-full bg-primary transition-all" style={{ width: `${job?.progress ?? 0}%` }} />
    </div>
    {job && <ul className="grid grid-cols-3 gap-2 text-sm">{job.steps.map(step => <li key={step.id} className="border border-line rounded-xl p-2">
      {job.operation === 'generate' ? `후보 ${step.candidateId} · ` : ''}{viewLabel[step.view]} · {statusLabel[step.status]}
      {step.error && <p className="text-error mt-1 break-words">{step.error.message}<span className="block text-xs">오류 ID: {step.error.requestId}</span></p>}
    </li>)}</ul>}
    {error && <p role="alert" className="text-error">{error}</p>}
    {job?.error && <p role="alert" className="text-error">{job.error.message} (오류 ID: {job.error.requestId})</p>}
    {active && job && <SecondaryButton disabled={sending} onClick={onCancel}>생성 취소</SecondaryButton>}
    {job && ['failed', 'cancelled'].includes(job.status) && <>
      <p className="text-secondary text-sm">완료된 이미지는 유지하고, 실패하거나 아직 생성하지 못한 이미지만 이어서 만들어요.</p>
      <PrimaryButton disabled={sending} onClick={onRetry}>남은 이미지만 다시 시도</PrimaryButton>
    </>}
  </section>;
}
