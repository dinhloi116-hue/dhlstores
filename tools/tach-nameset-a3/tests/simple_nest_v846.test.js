// node tools/tach-nameset-a3/tests/simple_nest_v846.test.js
// CorelDRAW-independent GUI regression: compact UI, automatic Group/loose routing,
// explicit opt-in for loose objects, original advanced controls and cm->mm geometry.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const html=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
const quickSrc=fs.readFileSync(path.join(root,'V846_SIMPLE_NEST_UI.html'),'utf8');
const groupSrc=fs.readFileSync(path.join(root,'V838_DIRECT_GROUPS.html'),'utf8');
assert.ok(html.includes('DHL_UI_VERSION=8.53'));
assert.equal((html.match(/id="dhl-v846-simple-nest"/g)||[]).length,1);
assert.ok(html.includes('#v77NestCard > *{display:none!important}'),'historical controls are always hidden, including extra settings mode');
assert.ok(html.includes('id="v846Go"'),'one primary action');
assert.ok(!/display:\s*(?:grid|flex)/i.test(quickSrc),'legacy MSHTML does not support grid/flex');
const ids={};
function node(id){return ids[id]={id,className:'',style:{},value:'',checked:false,innerText:'',innerHTML:'',firstChild:null};}
const card=node('v77NestCard');card.className='v77-card';card.insertBefore=q=>{ids[q.id]=q;};
for(const [id,v] of Object.entries({v77NestW:'58',v77NestH:'2000',v77NestGap:'0.5',
 v77FrameGapInput:'0',v77MarginT:'0',v77MarginB:'0',v77MarginL:'0',v77MarginR:'0',
 v77Rotate:'none',v838Rotate:'none',v838Order:'visual',v838Mode:'pack',
 v838Mirror:'no',v845Effort:'balanced'}))node(id).value=v;
for(const id of ['v838Run','v77NestBtn','v838DirectMsg','v77NestResult'])node(id);
node('v838Contour').checked=true;
node('v832AllowLoose').checked=false;
const art={Shapes:{Count:2},SizeWidth:250,SizeHeight:300};
let selection=[art],groupCalls=0,individualCalls=0;
let undoCalls=0;
const corel={ActiveSelectionRange:{get Count(){return selection.length},Item(n){return selection[n-1]}},
 ActiveDocument:{Unit:4,Undo(){undoCalls++;}},ActiveWindow:{Refresh(){}}};
const win={addEventListener(){},external:{Application:corel}};
const data={},storage={getItem:k=>Object.prototype.hasOwnProperty.call(data,k)?data[k]:null,setItem:(k,v)=>{data[k]=v;}};
const doc={getElementById:id=>ids[id]||null,getElementsByClassName(){return[];},
 createElement(tag){
  const out={id:'',className:'',style:{},firstChild:null,insertBefore(){},appendChild(){}};
  Object.defineProperty(out,'innerHTML',{set(value){
   this.content=value;
   for(const m of value.matchAll(/<\w+[^>]*\bid="([^"]+)"[^>]*>/g))node(m[1]);
  },get(){return this.content||'';}});
  return out;
 }};
win.DHLDirectGroups={run(){groupCalls++;ids.v838DirectMsg.innerText='✓ Group packed';return true;}};
const quick=quickSrc.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',quick)(
 win,doc,()=>{},'vi',()=>corel,storage);
assert.equal(win.DHLSimpleNest.mount(),true);
assert.match(card.className,/v846-simple/,'compact is initial mode');
assert.equal(win.DHLSimpleNest.undo(),false,'cannot undo unrelated Corel activity');
assert.equal(undoCalls,0);
assert.equal(ids.v846Rotate.checked,true,'first launch defaults to auto rotation');
assert.equal(ids.v846Contour.checked,true,'true contour remains enabled');
assert.equal(ids.v846Deep.checked,true,'first launch uses full search');
assert.equal(win.DHLSimpleNest.run(),true);
assert.equal(groupCalls,1,'Group path picked');
assert.equal(ids.v838Rotate.value,'auto');
assert.equal(ids.v845Effort.value,'deep');
const group=groupSrc.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1].replace(/\}\)\(\);\s*$/,'window.__groupTest={config,canFit};})();');
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',group)(
 win,doc,()=>{},'vi',()=>corel,storage);
const c=win.__groupTest.config();
assert.equal(c.W,580);assert.equal(c.H,20000);assert.equal(c.gap,5);
assert.equal(win.__groupTest.canFit(art,c),true,'250mm Group must fit 58cm material');
assert.equal(win.DHLSimpleNest.undo(),true);
assert.equal(undoCalls,1,'one grouped dàn should undo one command group');
ids.v846Advanced.onclick();
assert.ok(!/v846-simple/.test(card.className),'extra settings can expand; duplicate legacy controls remain CSS-hidden');
assert.match(ids.v846QuickPanel.className,/v849-extra-open/,'only the compact extra options expand');
ids.v846Advanced.onclick();
assert.match(card.className,/v846-simple/,'simple mode can be restored');
selection=[{SizeWidth:35,SizeHeight:50,Shapes:{Count:0}}];
win.V77NestSelected=()=>{individualCalls++;ids.v77NestResult.innerText='✓ Đã xếp 1 đối tượng';};
assert.equal(win.DHLSimpleNest.run(),false,'never silently ungroup loose contents');
ids.v847Objects.value='loose';ids.v847Objects.onchange();
// Restore the minimal UI routing stub after loading the real config() for geometry assertions.
// Full mixed-object Corel execution is separately covered by unified_mixed_v848.test.js.
win.DHLDirectGroups.run=function(){groupCalls++;ids.v838DirectMsg.innerText='✓ Packed unified shapes';return true;};
assert.equal(win.DHLSimpleNest.run(),true,'explicit loose opt-in works');
assert.equal(groupCalls,2,'mixed objects must use the SAME unified Group contour engine');
assert.equal(individualCalls,0,'legacy loose algorithm must not run');
console.log('PASS V8.46: compact defaults, true-contour Group routing, cm-mm accuracy, advanced toggle, loose guard');
