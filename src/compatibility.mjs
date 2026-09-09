import {Asar} from './asar.mjs';

// Static preflight finds a data contract, never a minified symbol or build number.
// The live adapter and local ledger must independently validate each message.
export function hasMessageContract(source) {
  return ['conversationId','turnId','sentAtMs','responseAnnotationTargetId'].every(key=>source.includes(key));
}
export async function inspectStructure(archivePath) {
  const archive=await Asar.open(archivePath);
  try {
    const manifest=JSON.parse((await archive.read('package.json')).toString());
    let scanned=0,bytes=0;
    const pending=[{node:archive.header.files?.webview,prefix:'webview'}],files=[];
    while(pending.length){
      const {node,prefix}=pending.pop();
      for(const [name,entry] of Object.entries(node?.files??{})){
        const namePath=prefix+'/'+name;
        if(entry.files){pending.push({node:entry,prefix:namePath});continue;}
        if(!name.endsWith('.js')||entry.unpacked||entry.link||entry.size>32*1024*1024)continue;
        files.push({namePath,size:entry.size});
      }
    }
    // Visit likely UI-sized modules first, without relying on bundle names.
    files.sort((a,b)=>Math.abs(Math.log2(Math.max(1,a.size)/400000))-Math.abs(Math.log2(Math.max(1,b.size)/400000)));
    for(const {namePath,size} of files){
      if(++scanned>10000||(bytes+=size)>256*1024*1024)throw new Error('Structural inspection limit exceeded');
      if(hasMessageContract((await archive.read(namePath)).toString()))return {
        matched:true,mode:'structural-v1',appVersion:manifest.version,contract:'message-anchor-v1',runtimeVerified:false};
    }
    return {matched:false,mode:'structural-v1',appVersion:manifest.version,runtimeVerified:false};
  }finally{await archive.close();}
}
