// node tools/tach-nameset-a3/tests/logo_safe_v853.test.js
// Mock CorelDRAW: inspect must not duplicate or modify artwork.
// Manual insertion may duplicate and group only after explicit approval.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../src');
const old=fs.readFileSync(path.join(dir,'V837_DIGIT_LOGO.html'),'utf8');
const ui=fs.readFileSync(path.join(dir,'V853_LOGO_SAFE.html'),'utf8');
const release=fs.readFileSync(path.join(dir,'DockerUI_CURRENT.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.53/);
assert.equal((release.match(/id="dhl-v853-logo-safe"/g)||[]).length,1);
assert.equal((release.match(/id="dhl-v837-digit-logo"/g)||[]).length,1);
assert.match(release,/#v82PanelNameset > #v853LogoPanel\{display:block!important\}/);
assert.match(ui,/v853Capture/);assert.match(ui,/v853Inspect/);assert.match(ui,/v853Apply/);
for(const [i,m] of [...release.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())
 assert.doesNotThrow(()=>new Function(m[1]),'release script '+i);
let selected=[],clones=0,groups=0,undo=0,duplicates=0;
const doc={Unit:4,Name:'SampleCDR',BeginCommandGroup(){},EndCommandGroup(){},Undo(){undo++;}};
const layer={Name:'Layer 1'};
const logo={Name:'SOURCE',SizeWidth:8,SizeHeight:10,CenterX:300,CenterY:300,Layer:layer,
 CopyToLayer(l){clones++;return{Name:'',Layer:l,SizeWidth:8,SizeHeight:10,
  SetSize(w,h){this.SizeWidth=w;this.SizeHeight=h;},OrderFrontOne(){},Delete(){},
  set CenterX(v){this.x=v;},set CenterY(v){this.y=v;}};}};
const num={Name:'NUMBER',SizeWidth:110,SizeHeight:250,CenterX:120,CenterY:100,Layer:layer,
 Text:{Story:{Text:'10'}},
 Duplicate(){duplicates++;let txt='10';return{SizeHeight:250,Text:{Story:{
  get Text(){return txt;},set Text(s){txt=s;}}},get SizeWidth(){return txt==='1'?32:70;},Delete(){}};}};
const app={ActiveDocument:doc,ActiveWindow:{Refresh(){}},
 get ActiveSelectionRange(){return{Count:selected.length,Item(i){return selected[i-1];}};},
 CreateShapeRange(){const a=[];return{Add(s){a.push(s);},Group(){groups++;return{Name:'',CreateSelection(){},
  Shapes:{Count:a.length,Item(i){return a[i-1];}}};}};}};
const win={external:{Application:app},addEventListener(){}};
const page={getElementById(){return null;}},storage={getItem(){return null;},setItem(){}};
new Function('window','document','localStorage','setTimeout','currentLang','corelApp',
 old.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1])(win,page,storage,()=>{},'vi',()=>app);
selected=[logo];assert.equal(win.DHLNumberLogo.capture(),true);
win.DHLNumberLogo.configure({on:true,pct:9,bottom:2,inset:1,mode:'per'});
selected=[num];let plan=win.DHLNumberLogo.inspectManual();
assert.equal(plan.logos,2);assert.equal(plan.targets,1);
assert.equal(doc.Unit,4);assert.equal(clones,0);assert.equal(duplicates,0);assert.equal(groups,0);
assert.equal(win.DHLNumberLogo.manual(),true);
assert.equal(groups,1);assert.equal(clones,2);assert.equal(doc.Unit,4);assert.equal(undo,0);
selected=[logo];assert.throws(()=>win.DHLNumberLogo.inspectManual(),/nguồn|source/i);
selected=[{Name:'GROUP',SizeWidth:100,SizeHeight:100,Shapes:{Count:1,Item(){return logo;}}}];
assert.throws(()=>win.DHLNumberLogo.inspectManual(),/nguồn|source/i);
assert.throws(()=>win.DHLNumberLogo.configure({on:true,pct:100,bottom:2,inset:1,mode:'per'}),/2–30/);
console.log('PASS V8.57: compact logo module, read-only preview, safe insertion and source guards');