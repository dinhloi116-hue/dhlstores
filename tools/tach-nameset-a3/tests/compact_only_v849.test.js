// node tools/tach-nameset-a3/tests/compact_only_v849.test.js
// Guarantee that legacy panels never reappear. Extra settings are small,
// mapped to the existing engine, and pages mode protects mixed input.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const source=fs.readFileSync(path.join(root,'V846_SIMPLE_NEST_UI.html'),'utf8');
const release=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
assert.ok(release.includes('DHL_UI_VERSION=8.57'));
assert.ok(source.includes('#v77NestCard > *{display:none!important}'));
assert.ok(source.includes('#v77NestCard > #v846QuickPanel{display:block!important}'));
assert.ok(source.includes('#v846QuickPanel.v849-extra-open #v849ExtraPanel{display:block!important}'));
assert.ok(!source.includes('TÙY CHỌN NÂNG CAO ▾'));
const js=source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
const fields={};const storageValues={};let selected=[],runs=0;
function el(id){return fields[id]||(fields[id]={id,className:'',value:'',checked:false,style:{},innerText:'',innerHTML:'',textContent:''});}
const card=el('v77NestCard');card.className='v77-card';card.insertBefore=q=>{fields[q.id]=q;};
for(const [id,value] of Object.entries({
 v77NestW:'58',v77NestH:'2000',v77NestGap:'.5',v77FrameGapInput:'0',
 v77MarginT:'0',v77MarginB:'0',v77MarginL:'0',v77MarginR:'0',
 v77Rotate:'none',v838Rotate:'auto',v838Mode:'pack',v838Order:'visual',
 v838Mirror:'no',v845Effort:'deep'
}))el(id).value=value;
for(const id of ['v838Run','v77NestBtn','v838DirectMsg','v77NestResult'])el(id);
el('v838Contour').checked=true;el('v832AllowLoose').checked=false;
const doc={getElementById(id){return fields[id]||null;},getElementsByClassName(){return[];},
 createElement(){const q={id:'',className:'',style:{},firstChild:null};
 Object.defineProperty(q,'innerHTML',{set(s){this.markup=s;
  for(const m of s.matchAll(/<\w+[^>]*\bid="([^"]+)"[^>]*>/g))el(m[1]);
  for(const [k,v] of Object.entries({v849Layout:'pack',v849Mirror:'no',
   v849Top:'0',v849Bottom:'0',v849Left:'0',v849Right:'0',v849FrameGap:'0'}))fields[k].value=v;
 },get(){return this.markup||'';}});
 return q;}};
const app={ActiveSelectionRange:{get Count(){return selected.length;},Item(n){return selected[n-1];}},
 ActiveDocument:{Undo(){}},ActiveWindow:{Refresh(){}}};
const win={addEventListener(){},external:{Application:app},
 DHLDirectGroups:{run(){runs++;el('v838DirectMsg').innerText='✓ packed';return true;}}};
const storage={getItem(k){return Object.prototype.hasOwnProperty.call(storageValues,k)?storageValues[k]:null;},
 setItem(k,v){storageValues[k]=v;}};
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',js)(
 win,doc,()=>{},'vi',()=>app,storage);
assert.equal(win.DHLSimpleNest.mount(),true);
assert.match(card.className,/v846-simple/);
const panel=el('v846QuickPanel');
assert.ok(!panel.className.includes('v849-extra-open'));
el('v846Advanced').onclick();
assert.ok(panel.className.includes('v849-extra-open'));
assert.ok(!/v846-simple/.test(card.className));
assert.ok(source.includes('#v77NestCard > *{display:none!important}'),
 'legacy panels MUST still be hidden while extras are open');
el('v849Top').value='1.5';el('v849Left').value='.6';
el('v849FrameGap').value='1';el('v849Mirror').value='yes';
el('v849Layout').value='pages';
win.DHLSimpleNest.saveIntoSource();
assert.equal(el('v77MarginT').value,'1.5');
assert.equal(el('v77MarginL').value,'.6');
assert.equal(el('v77FrameGapInput').value,'1');
assert.equal(el('v838Mirror').value,'yes');
assert.equal(el('v838Mode').value,'pages');
selected=[{Shapes:{Count:1},SizeWidth:120,SizeHeight:180}];
assert.equal(win.DHLSimpleNest.run(),true);
assert.equal(runs,1);
selected.push({Shapes:{Count:0},SizeWidth:25,SizeHeight:40});
el('v847Objects').value='loose';el('v847Objects').onchange();
assert.equal(win.DHLSimpleNest.run(),false,'one Group per page must reject mixed input');
assert.equal(runs,1);
el('v849Layout').value='pack';win.DHLSimpleNest.saveIntoSource();
assert.equal(win.DHLSimpleNest.run(),true,'mixed inputs may pack in roll mode');
assert.equal(runs,2);
el('v846Advanced').onclick();
assert.match(card.className,/v846-simple/);
assert.ok(!panel.className.includes('v849-extra-open'));
for(const [i,tag] of [...release.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())
 assert.doesNotThrow(()=>new Function(tag[1]),'snapshot script '+i);
console.log('PASS V8.49: no duplicate controls, compact optional settings, margins/mirror/roll/pages routes and safeguards');
