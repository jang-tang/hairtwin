import { randomUUID } from 'node:crypto';
import * as ai from './ai.service.js';
import * as repo from '../repositories/aiJob.repo.js';
import { getImageProvider } from '../providers/image/index.js';
import { readPng, regionBounds } from '../providers/image/png.js';
import { VIEW_KEYS, type AiJob, type GenerateInput, type EditRequest, type JobError, type ImageExecution } from '../providers/image/types.js';
import { AppError, conflict, notFound, badRequest } from '../utils/http.js';
import { causeDiagnostic } from '../utils/errorLog.js';
import { newId } from '../utils/ids.js';

const active = new Map<string, { job: repo.StoredJob; controller: AbortController }>();
const writes = new Map<string, Promise<void>>();
const starting = new Map<string, Promise<AiJob>>();
const executions = new Set<Promise<void>>();
let stopping = false;
function assertAcceptingJobs(): void {
  if (stopping) throw new AppError(503, 'SERVER_STOPPING', '서버가 종료 중입니다. 잠시 후 다시 시도해주세요.');
}
function snapshot(job: repo.StoredJob): AiJob {
  const { input: _, images: _images, designerId: _owner, provider: _provider, ...result } = job;
  return structuredClone(result);
}
async function save(job: repo.StoredJob) {
  job.completed = job.steps.filter(s => s.status === 'completed').length;
  // Image completion and DB finalization are distinct: only committed results reach 100%.
  job.progress = job.status === 'completed' ? 100 : Math.min(99, Math.floor(job.completed / job.total * 100));
  // Serialize checkpoint writes so network latency cannot overwrite a newer state.
  const checkpoint = structuredClone(job);
  const writing = (writes.get(job.id) ?? Promise.resolve()).catch(() => {}).then(() => repo.saveJob(checkpoint));
  writes.set(job.id, writing);
  try { await writing; } finally { if (writes.get(job.id) === writing) writes.delete(job.id); }
}
async function load(designerId: string, id: string) {
  const running = active.get(id)?.job;
  const job = running?.designerId === designerId ? running : (await repo.findJob(designerId, id));
  if (!job) throw notFound('이미지 작업을 찾을 수 없습니다.');
  if (!active.has(id) && ['queued', 'running'].includes(job.status)) {
    job.status = 'failed';
    job.error = { code: 'JOB_INTERRUPTED', message: '서버가 재시작되어 작업이 중단됐습니다. 남은 이미지만 다시 시도해주세요.', requestId: randomUUID() };
    for (const step of job.steps) if (step.status === 'running') step.status = 'pending';
    await save(job);
  }
  return job;
}
function jobError(error: unknown, job: repo.StoredJob, stepId?: string): JobError {
  const requestId = randomUUID();
  const safe = error instanceof AppError ? { code: error.code, message: error.message } :
    { code: 'IMAGE_JOB_FAILED', message: '이미지 처리에 실패했습니다. 남은 이미지만 다시 시도해주세요.' };
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', event: 'ai.job.failed',
    jobId: job.id, operation: job.operation, stepId, requestId, ...safe,
    ...(error instanceof AppError ? error.diagnostics : { cause: causeDiagnostic(error) }) }));
  return { ...safe, requestId };
}
async function launch(job: repo.StoredJob) {
  assertAcceptingJobs();
  if (active.has(job.id)) throw conflict('작업을 중단하는 중입니다. 잠시 후 다시 시도해주세요.');
  if (getImageProvider().kind !== job.provider) throw conflict('AI 모드가 변경됐습니다. 새 작업을 시작해주세요.');
  if (job.operation === 'edit') {
    const sessionId = (job.input as EditRequest).sessionId;
    if ([...active.values()].some(a => a.job.operation === 'edit' && (a.job.input as EditRequest).sessionId === sessionId))
      throw conflict('다른 편집이 진행 중입니다. 완료 후 다시 시도해주세요.');
  }
  const controller = new AbortController();
  job.status = 'queued'; delete job.error;
  for (const step of job.steps) if (step.status !== 'completed') { step.status = 'pending'; delete step.error; }
  active.set(job.id, { job, controller });
  try { await save(job); } catch (error) { active.delete(job.id); throw error; }
  const execution: ImageExecution = {
    signal: controller.signal,
    image: async (id, work) => {
      controller.signal.throwIfAborted();
      const step = job.steps.find(s => s.id === id);
      if (!step) throw new Error('Unknown image step');
      if (job.images[id]) return job.images[id];
      step.status = 'running'; await save(job);
      try {
        const image = await work(); controller.signal.throwIfAborted(); readPng(image);
        job.images[id] = image; step.status = 'completed'; await save(job);
        return image;
      } catch (error) {
        if (controller.signal.aborted) { step.status = 'pending'; await save(job); throw error; }
        step.status = 'failed'; step.error = jobError(error, job, id); await save(job); throw error;
      }
    },
  };
  // Launch after the 202 response; completion is polled independently of the HTTP request.
  const executionTask = Promise.resolve().then(async () => {
    try {
      controller.signal.throwIfAborted(); job.status = 'running'; await save(job);
      job.result = job.operation === 'generate'
        ? await ai.generate(job.designerId, job.input as GenerateInput, execution)
        : await ai.edit(job.designerId, job.input as EditRequest, execution);
      controller.signal.throwIfAborted();
      job.status = 'completed';
      for (const step of job.steps) step.status = 'completed';
    } catch (error) {
      job.status = controller.signal.aborted ? 'cancelled' : 'failed';
      if (!controller.signal.aborted) job.error = job.steps.find(s => s.error)?.error ?? jobError(error, job);
    } finally {
      try { await save(job); } finally { active.delete(job.id); }
    }
  }).catch(error => { jobError(error, job); });
  executions.add(executionTask);
  void executionTask.finally(() => executions.delete(executionTask));
}
export async function startJob(designerId: string, operation: AiJob['operation'], body: GenerateInput | EditRequest): Promise<AiJob> {
  assertAcceptingJobs();
  const key = designerId + ':' + operation + ':' + body.requestId;
  const existing = starting.get(key);
  if (existing) return existing;
  const pending = prepareJob(designerId, operation, body);
  starting.set(key, pending);
  try { return await pending; } finally { if (starting.get(key) === pending) starting.delete(key); }
}
async function prepareJob(designerId: string, operation: AiJob['operation'], body: GenerateInput | EditRequest): Promise<AiJob> {
  const prior = (await repo.findJobByRequest(designerId, operation, body.requestId));
  if (prior) return snapshot((await load(designerId, prior.id)));
  let input = body, candidateIds = ['A', 'B', 'C'];
  if (operation === 'generate') input = (await ai.prepareGeneration(designerId, body as GenerateInput));
  else {
    const edit = body as EditRequest, session = (await ai.getSession(designerId, edit.sessionId));
    const base = session.versions.find(v => v.id === edit.baseVersionId);
    if (!base) throw notFound('기준 이미지 버전을 찾을 수 없습니다.');
    if (session.versions.length >= 50) throw badRequest('상담당 이미지 버전은 최대 50개입니다.');
    const source = readPng(base.views[edit.view]); regionBounds(source.width, source.height, edit.region);
    if (session.provider !== getImageProvider().kind) throw conflict('AI 모드가 변경됐습니다. 새 상담을 시작해주세요.');
    candidateIds = [base.candidateId];
  }
  const steps = candidateIds.flatMap(candidateId => VIEW_KEYS.map(view => ({ id: candidateId + ':' + view, candidateId, view, status: 'pending' as const })));
  const job: repo.StoredJob = { id: newId('aij'), designerId, operation, input, provider: getImageProvider().kind,
    steps, images: {}, status: 'queued', completed: 0, total: steps.length, progress: 0, attempt: 1 };
  await launch(job); return snapshot(job);
}
export async function getJob(designerId: string, id: string) { return snapshot((await load(designerId, id))); }
export async function cancelJob(designerId: string, id: string) {
  const job = (await load(designerId, id));
  if (job.status === 'completed' || job.status === 'cancelled') return snapshot(job);
  job.status = 'cancelled'; delete job.error;
  active.get(id)?.controller.abort();
  for (const step of job.steps) if (step.status === 'running') step.status = 'pending';
  await save(job); return snapshot(job);
}
export async function retryJob(designerId: string, id: string) {
  assertAcceptingJobs();
  const job = (await load(designerId, id));
  if (job.status === 'completed' || job.status === 'queued' || job.status === 'running') return snapshot(job);
  if (active.has(id)) throw conflict('작업을 중단하는 중입니다. 잠시 후 다시 시도해주세요.');
  job.attempt++; await launch(job); return snapshot(job);
}

/** Stop providers, then finish checkpoint writes before closing database connections. */
export async function shutdownJobs(): Promise<void> {
  stopping = true;
  for (const running of active.values()) running.controller.abort();
  await Promise.allSettled([...starting.values()]);
  await Promise.allSettled([...executions]);
  await Promise.allSettled([...writes.values()]);
}
