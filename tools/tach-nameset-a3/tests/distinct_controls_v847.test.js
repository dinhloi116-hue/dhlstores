// node tools/tach-nameset-a3/tests/distinct_controls_v847.test.js
// Regression: four duplicate-looking checkboxes are NOT four equivalent modes.
// Three clear optimization presets map to distinct algorithm configs; rotation
// and Group-vs-loose policy remain independent and persist after reload.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const source=fs.readFileSync(path.join(root,'V846_SIMPLE_NEST_UI.html'),'utf8');
const release=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
const js=source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
assert.ok(release.includes('DHL_UI_VERSION=8.54'));
assert.equal((release.match(/id="dhl-v846-simple-nest"/g)||[]).length,1);
assert.ok(source.includes('v847-hidden-controls'));
assert.ok(source.includes('v847-mode-row'));
assert.ok(source.includes('display:none!important'));
assert.ok(!source.includes('<label class="v846-check"><input type="checkbox" id="v846Rotate"'));
function mount(settings){
 const ids={},data=Object.assign({},settings||{}),state={group:0,loose:0};let selection=[{Shapes:{Count:2},SizeWidth:200,SizeHeight:280}];
 function node(id){return ids[id]={id,className:'',value:'',checked:false,style:{},innerHTML:'',innerText:'',textContent:''};}
 const card=node('v77NestCard');card.className='v77-card';card.insertBefore=q=>{ids[q.id]=q;};
 for(const [id,value] of Object.entries({v77NestW:'58',v77NestH:'2000',v77NestGap:'0.5',v77FrameGapInput:'0',
 v77MarginT:'0',v77MarginB:'0',v77MarginL:'0',v77MarginR:'0',v77Rotate:'none',
 v838Rotate:'none',v838Order:'visual',v838Mode:'pack',v838Mirror:'no',v845Effort:'balanced'}))node(id).value=value;
 for(const id of ['v838Run','v77NestBtn','v838DirectMsg','v77NestResult'])node(id);
 node('v838Contour').checked=true;node('v832AllowLoose').checked=false;
 const doc={getElementById(id){return ids[id]||null;},getElementsByClassName(){return[];},
  createElement(tag){const el={id:'',className:'',style:{},firstChild:null};
   Object.defineProperty(el,'innerHTML',{set(v){this.content=v;for(const m of v.matchAll(/<\w+[^>]*\bid="([^"]+)"[^>]*>/g))node(m[1]);},get(){return this.content||'';}});
   return el;
  }};
 const app={ActiveSelectionRange:{get Count(){return selection.length;},Item(i){return selection[i-1];}},ActiveDocument:{Undo(){}},ActiveWindow:{Refresh(){}}};
 const window={addEventListener(){},external:{Application:app},DHLDirectGroups:{run(){state.group++;ids.v838DirectMsg.innerText='✓ Group packed';return true;}}};
 const storage={getItem(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null;},setItem(k,v){data[k]=v;}};
 new Function('window','document','setTimeout','currentLang','corelApp','localStorage',js)(window,doc,()=>{},'vi',()=>app,storage);
 assert.equal(window.DHLSimpleNest.mount(),true);
 return {window,ids,state,data,makeLoose(){
  selection=[{Shapes:{Count:0},SizeWidth:15,SizeHeight:25}];
  window.V77NestSelected=function(){state.loose++;ids.v77NestResult.innerText='✓ Đã xếp 1 đối tượng';};
 }};
}
const one=mount(),w=one.window,ids=one.ids;
assert.ok(ids.v847Deep.className.includes('selected'),'initial default is Deep mode');
assert.equal(ids.v847Rotate.value,'auto');
assert.equal(ids.v847Objects.value,'group');
assert.equal(w.DHLSimpleNest.run(),true);
assert.equal(one.state.group,1);
ids.v847Fast.onclick();
assert.equal(ids.v838Contour.checked,false,'Fast only uses bounding box');
assert.equal(ids.v845Effort.value,'balanced');
assert.ok(ids.v847Fast.className.includes('selected'));
ids.v847Contour.onclick();
assert.equal(ids.v838Contour.checked,true,'Contour enables exact silhouette');
assert.equal(ids.v845Effort.value,'balanced','Contour is a distinct medium-level preset');
ids.v847Deep.onclick();
assert.equal(ids.v838Contour.checked,true);
assert.equal(ids.v845Effort.value,'deep','Deep adds more search trials');
ids.v847Rotate.value='none';ids.v847Rotate.onchange();
assert.equal(ids.v838Rotate.value,'none','rotation is independent of mode');
one.makeLoose();
assert.equal(w.DHLSimpleNest.run(),false,'loose objects require opt-in');
ids.v847Objects.value='loose';ids.v847Objects.onchange();
assert.equal(w.DHLSimpleNest.run(),true,'explicit loose opt-in works');
assert.equal(one.state.group,2,'loose objects must use unified contour engine');
assert.equal(one.state.loose,0,'legacy individual packer must not run');
const two=mount(one.data);
assert.equal(two.ids.v847Rotate.value,'none','rotation persists');
assert.equal(two.ids.v847Objects.value,'loose','object policy persists');
assert.ok(two.ids.v847Deep.className.includes('selected'),'algorithm mode persists');
for(const [i,script] of [...release.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())assert.doesNotThrow(()=>new Function(script[1]),'script '+i);
console.log('PASS V8.47: three different algorithms, separate rotation and input policy, no visible duplicate checkboxes, persisted preferences');
