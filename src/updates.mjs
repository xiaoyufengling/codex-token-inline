import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function compareVersions(a,b) {
  const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)(?:-alpha\.(\d+))?$/.exec(v);
  const x=parse(a),y=parse(b);if(!x||!y)throw new Error('Invalid release version');
  for(let i=1;i<=4;i++){const d=Number(x[i]??Infinity)-Number(y[i]??Infinity);if(d)return Math.sign(d);}
  return 0;
}
export function assetFor(release,repository,name) {
  const asset=release.assets?.find(a=>a.name===name && a.state==='uploaded');
  if(!asset)return null;
  const expected=`https://github.com/${repository}/releases/download/${release.tag_name}/${name}`;
  if(asset.browser_download_url!==expected || !/^sha256:[a-f0-9]{64}$/.test(asset.digest??'') || !(asset.size>0&&asset.size<=128*1024*1024))return null;
  return asset;
}
async function responseBytes(response,max) {
  if(!response.ok)throw new Error('Update service unavailable');
  const chunks=[];let length=0;
  for await (const chunk of response.body){length+=chunk.length;if(length>max)throw new Error('Update exceeds size limit');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
export function verifyBytes(bytes,asset) {
  if(bytes.length!==asset.size || 'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')!==asset.digest)throw new Error('Update checksum mismatch');
}
export async function findUpdate({repository,version,packageVersion,skipped},fetcher=fetch) {
  if(!/^[\w-]+\/[\w.-]+$/.test(repository))throw new Error('Invalid release repository');
  const get=async(url,max)=>responseBytes(await fetcher(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'CodexTokenInline'},signal:AbortSignal.timeout(15000)}),max);
  const releases=JSON.parse((await get(`https://api.github.com/repos/${repository}/releases?per_page=30`,2*1024*1024)).toString());
  if(!Array.isArray(releases))throw new Error('Invalid release list');
  const candidates=releases.filter(r=>!r.draft && /^v\d+\.\d+\.\d+(?:-alpha\.\d+)?$/.test(r.tag_name) && compareVersions(r.tag_name,version)>0)
    .sort((a,b)=>compareVersions(b.tag_name,a.tag_name));
  for(const r of candidates.slice(0,10)){
    if(r.tag_name===skipped)continue;
    const manifestAsset=assetFor(r,repository,'compatibility.json');
    if(!manifestAsset)continue;
    const bytes=await get(manifestAsset.browser_download_url,65536);verifyBytes(bytes,manifestAsset);
    const manifest=JSON.parse(bytes.toString());
    if(manifest.version!==r.tag_name.slice(1)||!Array.isArray(manifest.packageVersions)||!manifest.packageVersions.includes(packageVersion))continue;
    const installer=assetFor(r,repository,`CodexTokenInline-Setup-${manifest.version}.exe`);
    if(installer)return {tag:r.tag_name,version:manifest.version,url:`https://github.com/${repository}/releases/tag/${r.tag_name}`,installer};
  }
  return null;
}
export async function downloadUpdate(update,directory,fetcher=fetch) {
  const bytes=await responseBytes(await fetcher(update.installer.browser_download_url,{signal:AbortSignal.timeout(120000)}),128*1024*1024);
  verifyBytes(bytes,update.installer);
  await fs.mkdir(directory,{recursive:true});
  const file=path.join(directory,'update-installer.exe');
  await fs.writeFile(file,bytes);return file;
}
