import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { RealImageProvider } from '../src/providers/image/real.provider.js';
import { createMask, pngUrl, readPng } from '../src/providers/image/png.js';
import type { GenerateInput, EditInput, ImageExecution } from '../src/providers/image/types.js';

function photo(color: number) {
  const p = new PNG({width:32,height:32}); p.data.fill(color);
  for(let i=3;i<p.data.length;i+=4) p.data[i]=255;
  return pngUrl(p);
}
const input: GenerateInput = {
  requestId: 'provider-test', customerName:'테스트 고객',
  photos:{front:photo(40),side:photo(70),back:photo(100)}, intent:'기장은 유지하고 볼륨을 줄이기',
  preset:{id:'layered',name:'레이어드',desc:'가벼운 층',memo:'과도한 볼륨 금지'},
  condition:{damage:'손상',texture:'반곱슬',thickness:'가늘음',density:'낮음',elasticity:'보통',feel:'거침'},
  bang:60,sideLength:65,sideHair:'많이 뜸',
};
function transport() {
  const forms: FormData[] = [];
  const fake: typeof fetch = async (url, init) => {
    assert.equal(url,'https://api.openai.com/v1/images/edits');
    const form = init!.body as FormData; forms.push(form);
    assert.equal(form.get('n'),'1'); assert.equal(form.get('output_format'),'png');
    assert.equal(new Headers(init!.headers).get('content-type'),null); // fetch sets multipart boundary.
    return new Response(JSON.stringify({data:[{b64_json:photo(110 + forms.length).split(',')[1]}]}),{status:200});
  };
  return { forms, provider: new RealImageProvider(fake,'test-only') };
}

test('job generation continues independent views and reuses all successful anchors and views on retry', async () => {
  const forms: FormData[] = [], images = new Map<string, string>();
  const provider = new RealImageProvider(async (_url, init) => {
    forms.push(init!.body as FormData);
    return forms.length === 2 ? new Response('{}', { status: 503 }) :
      new Response(JSON.stringify({ data: [{ b64_json: photo(100 + forms.length).split(',')[1] }] }), { status: 200 });
  }, 'test-only');
  const execution: ImageExecution = { signal: new AbortController().signal, image: async (id, work) => {
    if (images.has(id)) return images.get(id)!;
    const result = await work(); images.set(id, result); return result;
  } };
  await assert.rejects(() => provider.generate(input, execution), /503/);
  assert.equal(forms.length, 9); assert.equal(images.size, 8);
  const anchors = ['A', 'B', 'C'].map(id => images.get(id + ':front'));
  const result = await provider.generate(input, execution);
  assert.equal(forms.length, 10); assert.equal(images.size, 9);
  assert.deepEqual(result.candidates.map(c => c.views.front), anchors);
  assert.equal(await blobUrl(forms[9].getAll('image[]')[1]), anchors[0]);
});

test('a failed front anchor defers only its dependent views while other candidates finish', async () => {
  let calls = 0;
  const images = new Map<string, string>();
  const provider = new RealImageProvider(async () => ++calls === 1 ? new Response('{}', { status: 503 }) :
    new Response(JSON.stringify({ data: [{ b64_json: photo(100 + calls).split(',')[1] }] }), { status: 200 }), 'test-only');
  const execution: ImageExecution = { signal: new AbortController().signal, image: async (id, work) => {
    if (images.has(id)) return images.get(id)!;
    const result = await work(); images.set(id, result); return result;
  } };
  await assert.rejects(() => provider.generate(input, execution), /503/);
  assert.equal(calls, 7); assert.equal(images.size, 6);
  await provider.generate(input, execution);
  assert.equal(calls, 10); assert.equal(images.size, 9);
});

test('job cancellation aborts the real HTTP request and prevents subsequent image calls', async () => {
  const controller = new AbortController(); let calls = 0, signal: AbortSignal | undefined;
  const provider = new RealImageProvider(async (_url, init) => {
    calls++; signal = init?.signal as AbortSignal;
    return new Promise<Response>((_, reject) => signal!.addEventListener('abort', () => reject(signal!.reason), { once: true }));
  }, 'test-only');
  const execution: ImageExecution = { signal: controller.signal, image: (_id, work) => work() };
  const task = provider.generate(input, execution);
  controller.abort();
  await assert.rejects(task, error => (error as Error).name === 'AbortError');
  assert.equal(signal?.aborted, true); assert.equal(calls, 1);
});
async function blobUrl(value: FormDataEntryValue) {
  assert.ok(value instanceof Blob);
  return 'data:image/png;base64,' + Buffer.from(await value.arrayBuffer()).toString('base64');
}
test('candidate generation uses photos and constraints, with a separate anchor for each candidate',async()=>{
  const {forms,provider}=transport();
  const result=await provider.generate(input);
  assert.equal(forms.length,9); assert.equal(result.candidates.length,3);
  assert.equal(new Set(result.candidates.flatMap(c=>Object.values(c.views))).size,9);
  for(let candidate=0;candidate<3;candidate++){
    const front=forms[candidate*3], side=forms[candidate*3+1], back=forms[candidate*3+2];
    assert.equal(await blobUrl(front.getAll('image[]')[0]),input.photos.front);
    assert.equal(await blobUrl(side.getAll('image[]')[0]),input.photos.side);
    assert.equal(await blobUrl(back.getAll('image[]')[0]),input.photos.back);
    assert.equal(await blobUrl(side.getAll('image[]')[1]),result.candidates[candidate].views.front);
    assert.equal(await blobUrl(back.getAll('image[]')[1]),result.candidates[candidate].views.front);
    const prompt=String(front.get('prompt'));
    for(const value of ['기장은 유지','손상','반곱슬','레이어드','60','65','많이 뜸']) assert.ok(prompt.includes(value),value);
    assert.ok(prompt.includes('Candidate '+['A','B','C'][candidate]));
  }
});
test('mask alpha matches selected view; edits preserve outside pixels and propagate edited anchor',async()=>{
  const {forms,provider}=transport();
  const edit: EditInput={
    ...input, sessionId:'session',baseVersionId:'version',view:'side',region:{id:'r',type:'side',x:.25,y:.25,w:.5,h:.5,label:'옆머리'},
    views:input.photos,original:input,candidate:{id:'B',name:'균형',desc:'볼륨'},feedback:['많이 다운'],freeText:'귀를 조금 더 보여주세요.',
  };
  const out=await provider.edit(edit);
  assert.equal(forms.length,3);
  assert.equal(await blobUrl(forms[0].getAll('image[]')[0]),input.photos.side);
  const mask=PNG.sync.read(Buffer.from(await (forms[0].get('mask') as Blob).arrayBuffer()));
  assert.equal(mask.width,32); assert.equal(mask.height,32);
  assert.equal(mask.data[3],255); assert.equal(mask.data[(10*32+10)*4+3],0);
  const base=readPng(input.photos.side), edited=readPng(out.views.side);
  assert.deepEqual(edited.data.subarray(0,4),base.data.subarray(0,4));
  assert.notDeepEqual(edited.data.subarray((10*32+10)*4,(10*32+10)*4+4),base.data.subarray((10*32+10)*4,(10*32+10)*4+4));
  assert.equal(await blobUrl(forms[1].getAll('image[]')[1]),out.views.side);
  assert.equal(await blobUrl(forms[2].getAll('image[]')[1]),out.views.side);
  assert.ok(String(forms[0].get('prompt')).includes(edit.freeText));
  assert.ok(String(forms[0].get('prompt')).includes('65'));
});
test('malformed PNG and out-of-image rectangles are rejected before sending',()=>{
  assert.throws(()=>readPng('https://127.0.0.1/private.png'));
  assert.throws(()=>readPng('data:image/png;base64,YWJj'));
  assert.throws(()=>createMask(input.photos.front,{id:'r',type:'fringe',x:.9,y:0,w:.2,h:.2,label:'앞'}));
});
test('real mode reports missing keys, upstream failures and empty outputs without a mock substitute',async()=>{
  await assert.rejects(()=>new RealImageProvider(fetch,'').generate(input),/API 키/);
  await assert.rejects(()=>new RealImageProvider(async()=>new Response('{}',{status:429}),'test-only').generate(input),/429/);
  await assert.rejects(()=>new RealImageProvider(async()=>new Response('{}',{status:200}),'test-only').generate(input),/PNG/);
});

test('provider diagnostics distinguish timeout, network and invalid output and identify propagation failures', async () => {
  const timeout = new RealImageProvider(async () => { throw new DOMException('private request', 'TimeoutError'); }, 'test-only');
  await assert.rejects(() => timeout.generate(input), (error: any) => error.diagnostics.ai.reason === 'timeout' && error.diagnostics.ai.view === 'front');
  const network = new RealImageProvider(async () => { throw new TypeError('private request', { cause: { code: 'ECONNRESET' } }); }, 'test-only');
  await assert.rejects(() => network.generate(input), (error: any) => error.diagnostics.ai.reason === 'network' && error.diagnostics.cause.code === 'ECONNRESET');
  const empty = new RealImageProvider(async () => new Response('{}', { status: 200 }), 'test-only');
  await assert.rejects(() => empty.generate(input), (error: any) => error.diagnostics.ai.reason === 'invalid_output');
  let calls = 0;
  const side = new RealImageProvider(async () => ++calls === 1
    ? new Response(JSON.stringify({ data: [{ b64_json: photo(100).split(',')[1] }] }), { status: 200 })
    : new Response('upstream unavailable', { status: 503, headers: { 'x-request-id': 'req_side_failure' } }), 'test-only');
  await assert.rejects(() => side.generate(input), (error: any) => error.diagnostics.ai.phase === 'propagate'
    && error.diagnostics.ai.candidateId === 'A' && error.diagnostics.ai.view === 'side'
    && error.diagnostics.ai.upstreamStatus === 503 && error.diagnostics.ai.upstreamRequestId === 'req_side_failure');
});
