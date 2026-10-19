// node tools/tach-nameset-a3/tests/fast_updater_v840.test.js
// UI bootstrap regression: latest-only PowerShell updater, no installer chain.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/V840_FAST_UPDATER.html'),'utf8');
const script=html.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'script exists');
function exercise(exitCode){
 const state={lastCommand:'',lastScript:'',launches:0,refreshed:'',alerts:[]};
 const button={disabled:false,innerHTML:'',onclick:null,setAttribute(k,v){this[k]=v;}};
 const doc={getElementById(id){return id==='reloadGit'?button:null;}};
 const window={addEventListener(){},location:{href:'file:///C:/Program%20Files/Corel/Addons/DHL_A3_Nameset/DockerUI.html?old=1',replace(url){state.refreshed=url;}}};
 const shell={
  ExpandEnvironmentStrings(s){return s.replace('%TEMP%','C:\\Temp').replace('%SystemRoot%','C:\\Windows');},
  Run(command){state.launches++;state.lastCommand=command;return exitCode;}
 };
 const fso={
  CreateTextFile(file){assert.ok(file.endsWith('DHL_NAMESET_LATEST_LAUNCH.ps1'));return{
   Write(script){state.lastScript=script;},Close(){}
  };},
  DeleteFile(){}
 };
 const alerts=[];
 const ActiveXObject=function(id){if(id==='WScript.Shell')return shell;if(id==='Scripting.FileSystemObject')return fso;throw Error('Unexpected ActiveX: '+id);};
 new Function('window','document','setTimeout','currentLang','ActiveXObject','alert',script)(
   window,doc,()=>{},'vi',ActiveXObject,(s)=>alerts.push(s));
 assert.equal(button.onclick,window.DHLFastUpdater.run);
 assert.equal(window.DHLFastUpdater.install(),true);
 const ok=button.onclick();
 assert.equal(state.launches,1);
 assert.ok(state.lastScript.includes('UPDATE_DHL_NAMESET.ps1?fresh='));
 assert.ok(!state.lastScript.includes('CAI_TOOL_TACH_NAMESET_A3.bat'));
 assert.ok(!state.lastScript.includes('CAI_DHL_NAMESET_COREL_2021.ps1'));
 assert.ok(state.lastCommand.includes('powershell.exe'));
 assert.equal(button.disabled,false);
 if(exitCode===0){assert.equal(ok,true);assert.ok(state.refreshed.includes('latest='));assert.equal(alerts.length,0);}
 else{assert.equal(ok,false);assert.equal(state.refreshed,'');assert.equal(alerts.length,1);}
}
exercise(0);exercise(1);
const ps=fs.readFileSync(path.join(__dirname,'../UPDATE_DHL_NAMESET.ps1'),'utf8');
assert.ok(ps.includes('DockerUI_CURRENT.html?fresh='));
assert.ok(ps.includes('[IO.File]::Replace('));
assert.ok(ps.includes('Get-FileHash'));
assert.ok(ps.includes('UP TO DATE (skip)'));
assert.ok(!ps.includes('Get-ChildItem -LiteralPath $root -Directory -Filter'));
assert.ok(!ps.includes(' -Recurse'));
assert.ok(!ps.includes("DHL_UI_VERSION=8.39"),'must not pin prior version');
assert.ok(ps.includes('DHL_UI_VERSION=([0-9]+'));
console.log('PASS: fast update is direct, safe, reentrant; no old BAT or recursive search; current version dynamic');
