import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {nativeDomSource, bridgeSource} from '../src/native-assets.mjs';
import {UsageService} from '../src/service.mjs';
import {Cdp} from '../src/cdp.mjs';
const [archive,portText,statusPath,mode] = process.argv.slice(2);
const {source,report} = await nativeDomSource(archive);
if (mode === '--check') { console.log(JSON.stringify({compatible:report.matched,mode:report.mode,runtimeValidation:'required',reloadsPage:false,interceptsResources:false})); process.exit(0); }
const port = Number(portText);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const service = new UsageService({store:path.join(path.dirname(statusPath),'objectives.json')});
const languageFile=path.join(path.dirname(statusPath),'..','language.txt');
async function readLanguage(){try{return (await fs.readFile(languageFile,'utf8')).replace(/^\uFEFF/,'').trim()==='en'?'en':'zh';}catch{return 'zh';}}
const connections = new Map(), attempted = new Set();
let stopping=false, lastSeen=Date.now(), attached=false, delivered=0, mounted=0, lastWrite=0, failure;
let writes=Promise.resolve();
async function status(state,detail) {
  lastWrite=Date.now();
  const record=JSON.stringify({state,detail,mode:'post-load-dom',snapshotsDelivered:delivered,mounted,at:lastWrite});
  writes=writes.catch(()=>{}).then(()=>fs.writeFile(statusPath,record)); await writes;
}
async function attach(target) {
  const cdp=await Cdp.connect(target.webSocketDebuggerUrl,port);
  connections.set(target.id,cdp);
  const contexts=new Set(); let frameId,inFlight=0;
  cdp.onClose=()=>connections.delete(target.id);
  cdp.onError=()=>status('warning','Snapshot or context changed').catch(()=>{});
  cdp.on('Runtime.executionContextCreated',({context})=>{
    if(context.auxData?.isDefault && context.auxData.frameId===frameId && context.origin?.startsWith('app://')) contexts.add(context.id);
  });
  cdp.on('Runtime.executionContextDestroyed',({executionContextId})=>contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared',()=>contexts.clear());
  cdp.on('Runtime.bindingCalled',async({name,payload,executionContextId})=>{
    if(name!=='__ctiRequest' || !contexts.has(executionContextId) || payload.length>2048 || inFlight>=64)return;
    let request;try{request=JSON.parse(payload);}catch{return;}
    if(!Number.isSafeInteger(request.id)||!request.args)return;
    inFlight++;
    try{
      const {threadId,turnId,messageId,sentAtMs}=request.args;
      let value=null,error=null;
      try{value=await service.snapshot({threadId,turnId,messageId,sentAtMs,requireEvidence:true});}catch{error='Usage temporarily unavailable';}
      const result=await cdp.send('Runtime.evaluate',{contextId:executionContextId,expression:`globalThis.__ctiDeliver?.(${request.id},${JSON.stringify(value)},${JSON.stringify(error)})`});
      if(!error&&!result.exceptionDetails&&value?.anchorValid===true){delivered++;if(delivered===1||Date.now()-lastWrite>2000)await status('usage-ready');}
    }finally{inFlight--;}
  });
  try{
    frameId=(await cdp.send('Page.getFrameTree')).frameTree.frame.id;
    await cdp.send('Runtime.enable');
    // Wait for the normal app navigation; never reload, navigate or pause requests.
    let ready=false;
    for(let i=0;i<60;i++){
      const result=await cdp.send('Runtime.evaluate',{expression:"location.protocol === 'app:' && document.readyState === 'complete'",returnByValue:true});
      if(result.result?.value===true){ready=true;break;}
      await delay(500);
    }
    if(!ready)throw new Error('Original page did not finish loading; no injection performed');
    await cdp.send('Runtime.addBinding',{name:'__ctiRequest'});
    const injection=`globalThis.__ctiLanguage=${JSON.stringify(await readLanguage())};\n`+bridgeSource+'\n'+source;
    const result=await cdp.send('Runtime.evaluate',{expression:injection,returnByValue:true});
    if(result.exceptionDetails)throw new Error('DOM enhancement initialization failed');
    attached=true;await status('attached','Normal app page loaded; enhancement mounted without reload');
    // Future user-initiated reloads receive the same passive enhancement.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:injection});
  }catch(error){cdp.close();connections.delete(target.id);throw error;}
}
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
await status('starting');
try{
  while(!stopping){
    try{
      const response=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1500)});
      const targets=await response.json();
      const pages=targets.filter(t=>t.type==='page'&&t.url?.startsWith('app://')&&t.webSocketDebuggerUrl);
      if(pages.length)lastSeen=Date.now();
      for(const target of pages)if(!attempted.has(target.id)){
        attempted.add(target.id);
        try{await attach(target);}catch(error){failure=String(error.message).slice(0,160);stopping=true;break;}
      }
      for(const cdp of connections.values()){
        const result=await cdp.send('Runtime.evaluate',{expression:`globalThis.__ctiDom?.setLanguage(${JSON.stringify(await readLanguage())});globalThis.__ctiDom?.mounted ?? 0`,returnByValue:true});
        mounted=Number(result.result?.value)||0;
      }
    }catch{/* Transient startup/shutdown, without navigation or retries that reload the app. */}
    if(Date.now()-lastSeen>(attached?10000:45000))break;
    await delay(1000);
  }
}finally{
  for(const cdp of connections.values())cdp.close();
  await status(failure||!attached?'error':'stopped',failure??(attached?undefined:'No compatible original application page became available'));
}
if(failure||!attached)process.exitCode=1;
