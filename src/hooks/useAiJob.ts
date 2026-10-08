import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, getToken } from '../api/server';
import { useConsult } from '../stores/consultationStore';
import type { AiJob, EditRequest, GenerateInput } from '../../server/src/providers/image/types';

const starting = new Map<string, Promise<AiJob>>();
export function useAiJob(operation: 'generate' | 'edit') {
  const field = operation === 'generate' ? 'generationJobId' : 'editJobId';
  const id = useConsult(s => s[field]);
  const [job, setJob] = useState<AiJob>();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [revision, setRevision] = useState(0);
  const [missing, setMissing] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let live = true, timer: ReturnType<typeof setTimeout>;
    setJob(undefined); setError(''); setMissing(false);
    if (!id) return;
    const poll = async () => {
      try {
        const next = await api.ai.job(id);
        if (!live) return;
        setJob(next); setError('');
        if (next.status === 'queued' || next.status === 'running') timer = setTimeout(poll, 750);
      } catch (e) {
        if (!live) return;
        setError(e instanceof Error ? e.message : '작업 상태를 불러오지 못했어요.');
        if (e instanceof ApiError && e.status === 404) setMissing(true);
        // A transient polling failure must not start a new generation.
        if (!(e instanceof ApiError && [401, 404].includes(e.status))) timer = setTimeout(poll, 2500);
      }
    };
    void poll();
    return () => { live = false; clearTimeout(timer); };
  }, [id, revision]);
  const start = useCallback(async (body: GenerateInput | EditRequest) => {
    if (!getToken()) throw new Error('서버에 로그인한 뒤 이미지를 생성해주세요.');
    const key = getToken() + ':' + operation + ':' + body.requestId;
    setSending(true); setError('');
    let task = starting.get(key);
    if (!task) {
      task = operation === 'generate' ? api.ai.startGeneration(body as GenerateInput) : api.ai.startEdit(body as EditRequest);
      starting.set(key, task);
      void task.finally(() => starting.delete(key)).catch(() => {});
    }
    try {
      const next = await task;
      if (mounted.current) { useConsult.getState().set({ [field]: next.id }); setJob(next); }
      return next;
    } finally { if (mounted.current) setSending(false); }
  }, [operation, field]);
  const action = async (kind: 'cancel' | 'retry') => {
    if (!id) return;
    setSending(true); setError('');
    try {
      const next = await (kind === 'cancel' ? api.ai.cancelJob(id) : api.ai.retryJob(id));
      if (mounted.current) { setJob(next); setRevision(n => n + 1); }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : '작업 요청에 실패했어요.'); }
    finally { if (mounted.current) setSending(false); }
  };
  return { id, job, error, sending, missing, busy: sending || !!(id && !missing && (!job || ['queued', 'running'].includes(job.status))),
    start, cancel: () => action('cancel'), retry: () => action('retry'),
    clear: () => { useConsult.getState().set({ [field]: '', ...(operation === 'edit' ? { editRequestId: '' } : {}) }); setJob(undefined); setError(''); setMissing(false); } };
}
