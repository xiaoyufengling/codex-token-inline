import fs from 'node:fs/promises';
import {findUpdate,downloadUpdate} from '../src/updates.mjs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),stateFile=new URL('state/update.json',root);
const [mode,packageVersion,value]=process.argv.slice(2);
try {
 const config=JSON.parse(await fs.readFile(new URL('release.json',root),'utf8'));
 let state={};try{state=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch{}
 async function save(){await fs.mkdir(new URL('state/',root),{recursive:true});await fs.writeFile(stateFile,JSON.stringify(state));}
 if(mode==='skip'){if(!/^v\d+\.\d+\.\d+(?:-alpha\.\d+)?$/.test(value))throw new Error('Invalid skip version');state.skipped=value;await save();console.log('{}');}
 else if(mode==='auto'&&state.packageVersion===packageVersion&&Date.now()-state.checkedAt<86400000){console.log('{}');}
 else {
  const update=await findUpdate({...config,packageVersion,skipped:mode==='auto'?state.skipped:null});
  state.checkedAt=Date.now();state.packageVersion=packageVersion;await save();
  if(mode==='download'){
   if(!update||update.tag!==value)throw new Error('Release changed; check again');
   console.log(JSON.stringify({file:await downloadUpdate(update,fileURLToPath(new URL('state/',root)))}));
  }else console.log(JSON.stringify(update??{}));
 }
}catch{console.error('Update check or download failed. Existing installation unchanged.');process.exitCode=1;}
