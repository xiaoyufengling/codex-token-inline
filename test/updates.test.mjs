import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {compareVersions,assetFor,findUpdate,verifyBytes} from '../src/updates.mjs';
const repository='owner/project';
function asset(tag,name,bytes){return {name,state:'uploaded',size:bytes.length,digest:'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex'),browser_download_url:`https://github.com/${repository}/releases/download/${tag}/${name}`};}
test('release ordering handles numbered previews and stable versions',()=>{
 assert.equal(compareVersions('v0.2.0-alpha.10','0.2.0-alpha.5'),1);
 assert.equal(compareVersions('0.2.0','0.2.0-alpha.10'),1);
 assert.equal(compareVersions('0.2.0','0.2.0'),0);
 assert.throws(()=>compareVersions('latest','0.2.0'));
});
test('only compatible newer releases from the configured repository are offered',async()=>{
 const payloads=new Map(),releases=['0.2.0-alpha.7','0.2.0-alpha.6'].map((version,i)=>{
  const tag='v'+version,bytes=Buffer.from(JSON.stringify({version,packageVersions:[i?'new-client':'other-client']}));
  const m=asset(tag,'compatibility.json',bytes),exe=asset(tag,`CodexTokenInline-Setup-${version}.exe`,Buffer.from('test installer'));
  payloads.set(m.browser_download_url,bytes);return {tag_name:tag,draft:false,assets:[m,exe]};
 });
 const fetcher=async url=>new Response(url.includes('/releases?')?JSON.stringify(releases):payloads.get(url));
 const params={repository,version:'0.2.0-alpha.5',packageVersion:'new-client'};
 assert.equal((await findUpdate(params,fetcher)).tag,'v0.2.0-alpha.6');
 assert.equal(await findUpdate({...params,skipped:'v0.2.0-alpha.6'},fetcher),null);
 assert.equal(await findUpdate({...params,version:'0.2.0-alpha.8'},fetcher),null);
 assert.equal(assetFor({...releases[0],assets:[{...releases[0].assets[0],browser_download_url:'https://example.com/malware'}]},repository,'compatibility.json'),null);
});
test('tampered downloads never pass verification',()=>{
 const bytes=Buffer.from('trusted'),spec=asset('v0.2.0','installer.exe',bytes);
 assert.doesNotThrow(()=>verifyBytes(bytes,spec));
 assert.throws(()=>verifyBytes(Buffer.from('changed'),spec),/checksum/);
});
test('structural releases can reach an unknown future Windows client without exact version entries',async()=>{
 const version='0.2.0-alpha.6',tag='v'+version;
 const bytes=Buffer.from(JSON.stringify({version,platform:'win32',compatibilityMode:'structural-v1',packageVersions:[]}));
 const m=asset(tag,'compatibility.json',bytes),exe=asset(tag,`CodexTokenInline-Setup-${version}.exe`,Buffer.from('test installer'));
 const fetcher=async url=>new Response(url.includes('/releases?')?JSON.stringify([{tag_name:tag,assets:[m,exe]}]):bytes);
 assert.equal((await findUpdate({repository,version:'0.2.0-alpha.5',packageVersion:'99.999.1234.0'},fetcher)).tag,tag);
});
