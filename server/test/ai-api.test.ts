import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Server } from 'node:http';
import type { GenerateInput, GenerationResult, EditResult } from '../src/providers/image/types.js';

const directory=mkdtempSync(join(tmpdir(),'hairtwin-ai-test-'));
process.env.DB_PATH=join(directory,'test.sqlite');process.env.AI_PROVIDER='mock';
process.env.AUTH_PROVIDER='mock';process.env.SEED_DEMO='false';
let server:Server,base:string,token:string,otherToken:string;
let generated:GenerationResult,edited:EditResult;
const p=new PNG({width:32,height:32});p.data.fill(180);for(let i=3;i<p.data.length;i+=4)p.data[i]=255;
const photo='data:image/png;base64,'+PNG.sync.write(p).toString('base64');
const input:GenerateInput={
  requestId:'integration-generate',customerName:'샘플 고객',intent:'앞머리를 가볍게',
  photos:{front:photo,side:photo,back:photo},preset:{id:'layered',name:'레이어드',desc:'층을 가볍게'},presetId:'layered',
  condition:{damage:'건강',texture:'직모',thickness:'보통',density:'보통',elasticity:'보통',feel:'보통'},
  bang:45,sideLength:50,sideHair:'조금 뜸',
};
async function request(path:string,method='GET',body?:unknown,auth=token){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,...await response.json() as {ok:boolean;data:any;error?:{code:string}}};
}
before(async()=>{
  const {buildApp}=await import('../src/app.js');
  server=buildApp().listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';
  token=(await request('/auth/login','POST',{name:'테스트 디자이너'},'')).data.token;
  otherToken=(await request('/auth/login','POST',{name:'다른 디자이너'},'')).data.token;
});
after(async()=>{
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  const {closeDb}=await import('../src/db/database.js');closeDb();
  rmSync(directory,{recursive:true,force:true});
});
test('photos are required, arbitrary URLs and invalid input are rejected',async()=>{
  assert.equal((await request('/ai/generate','POST',{...input,photos:undefined})).status,400);
  assert.equal((await request('/ai/generate','POST',{...input,photos:{...input.photos,front:'https://example.com/photo.png'}})).status,400);
  assert.equal((await request('/ai/generate','POST',input,'')).status,401);
});
test('generate persists three distinct candidates, deduplicates concurrent/retried requests',async()=>{
  const [a,b]=await Promise.all([request('/ai/generate','POST',input),request('/ai/generate','POST',input)]);
  assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(a.data.sessionId,b.data.sessionId);
  generated=a.data;assert.equal(generated.versions.length,3);
  assert.equal(new Set(generated.candidates.map(c=>c.views.front)).size,3);
  assert.equal((await request('/ai/generate','POST',input)).data.sessionId,generated.sessionId);
});
test('edits append returned images, preserve baseline and support branches from older versions',async()=>{
  const original=generated.versions[0];
  const body={requestId:'edit-one',sessionId:generated.sessionId,baseVersionId:original.id,view:'side',
    region:{id:'r',type:'side',x:.25,y:.25,w:.5,h:.5,label:'옆머리'},bang:60,sideLength:65,condition:input.condition,sideHair:'많이 뜸',feedback:['많이 다운'],freeText:'귀가 보이게'};
  const response=await request('/ai/edit','POST',body);assert.equal(response.status,200);edited=response.data;
  assert.equal(edited.version.parentId,original.id);assert.equal(edited.version.label,'V2');
  assert.equal(edited.version.settings.sideLength,65);assert.equal(edited.version.freeText,body.freeText);
  assert.notEqual(edited.version.views.side,original.views.side);
  assert.equal((await request('/ai/edit','POST',body)).data.version.id,edited.version.id);
  const branch=await request('/ai/edit','POST',{...body,requestId:'edit-branch',freeText:'다른 길이'});
  assert.equal(branch.data.version.parentId,original.id);assert.equal(branch.data.version.label,'V3');
  const session=await request('/ai/sessions/'+generated.sessionId);
  assert.equal(session.data.versions.length,5);
  assert.deepEqual(session.data.versions[0].views,original.views);
});
test('invalid masks and failed edits do not append versions; sessions are owner scoped',async()=>{
  const body={requestId:'bad-edit',sessionId:generated.sessionId,baseVersionId:edited.version.id,view:'front',
    region:{id:'r',type:'fringe',x:.9,y:0,w:.3,h:.2,label:'앞머리'},bang:45,sideLength:50,condition:input.condition,sideHair:'조금 뜸',feedback:[],freeText:''};
  assert.equal((await request('/ai/edit','POST',body)).status,400);
  assert.equal((await request('/ai/edit','POST',{...body,region:null,freeText:'__fail__'})).status,502);
  assert.equal((await request('/ai/sessions/'+generated.sessionId)).data.versions.length,5);
  assert.equal((await request('/ai/sessions/'+generated.sessionId,'GET',undefined,otherToken)).status,404);
  assert.equal((await request('/ai/edit','POST',{...body,region:null},otherToken)).status,404);
});
test('record stores the selected returned images and retains session history through DB reopening',async()=>{
  const body={customerName:input.customerName,views:input.photos,sessionId:generated.sessionId,selectedVersionId:edited.version.id,
    stylistReview:{versionId:edited.version.id,possible:'가능',curl:'중',sideControl:'다운',notes:[],memo:''}};
  const record=await request('/records','POST',body);assert.equal(record.status,201);
  assert.deepEqual(record.data.views,edited.version.views);
  assert.equal(record.data.selectedVersionId,edited.version.id);
  assert.equal((await request('/records','POST',body)).data.id,record.data.id);
  assert.equal((await request('/records','POST',body,otherToken)).status,404);
  const {closeDb}=await import('../src/db/database.js');closeDb();
  const restored=await request('/ai/sessions/'+generated.sessionId);
  assert.equal(restored.data.versions.length,5);
  assert.deepEqual(restored.data.versions.find((v:any)=>v.id===edited.version.id).views,edited.version.views);
  const fetched=await request('/records/'+record.data.id);assert.equal(fetched.data.sessionId,generated.sessionId);
});
