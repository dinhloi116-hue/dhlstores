// Run: node tools/tach-nameset-a3/tests/direct_groups.test.js
// Pure JavaScript + simulated Corel COM. Test real CorelDRAW before production.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const c=fs.readFileSync(path.join(__dirname,'../src/V838_DIRECT_GROUPS.html'),'utf8');
let js=c.match(/<script[^>]*>([\s\S]*?)<\/script>/i)[1];
js=js.replace(/\}\)\(\);\s*$/,"window.__test={runPlan,choose,pagesGroups,packGroups,ordered,group,execute};})();");
function scenario(mode,count,fail){
 let pages=[],deleted=0,undo=0,copies=0,frames=0;
 function page(i){
  return {CenterX:148.5,CenterY:210,SizeWidth:297,SizeHeight:420,
   ActiveLayer:{Shapes:{get Count(){return count;}},CreateRectangle2(){
    frames++;return{Fill:{ApplyNoFill(){}},Outline:{Width:0,Color:{CMYKAssign(){}}},OrderToBack(){}};
   }},
   SetSize(w,h){this.SizeWidth=w;this.SizeHeight=h;},MoveTo(){},Activate(){}};
 }
 pages=[page(1)];
 const originals=Array.from({length:count},(_,i)=>({
   Name:'GROUP '+(i+1),Shapes:{Count:3},SizeWidth:32,SizeHeight:40,
   CenterX:35+i*24,CenterY:150,Rotate(){},Flip(){},
   CopyToLayer(){
    if(fail===i)throw Error('simulate failure');
    copies++;return{CenterX:0,CenterY:0,Flip(){},CreateSelection(){}};
   },Delete(){deleted++;}
 }));
 const doc={Unit:4,get Pages(){return{Count:pages.length}},BeginCommandGroup(){},EndCommandGroup(){},Undo(){undo++},AddPagesEx(){
  let p=page(pages.length+1);pages.push(p);return p;
 }};
 const corel={ActiveDocument:doc,ActivePage:pages[0],ActiveWindow:{Refresh(){}},get ActiveSelectionRange(){
  return{Count:originals.length,Item(n){return originals[n-1]}};
 }};
 const fields={
  v77NestW:{value:mode==='pages'?297:580},v77NestH:{value:mode==='pages'?420:2000},
  v77NestGap:{value:5},v77MarginT:{value:5},v77MarginB:{value:5},
  v77MarginL:{value:5},v77MarginR:{value:5},v77FrameGapInput:{value:20},
  v838Mode:{value:mode},v838Rotate:{value:'auto'},
  v838Mirror:{value:'no'},v838Order:{value:'visual'},
  v838DirectMsg:{innerHTML:'',className:''}
 };
 const win={addEventListener(){},external:{Application:corel}};
 new Function('window','document','setTimeout','currentLang','corelApp','localStorage',js)(
  win,{getElementById(id){return fields[id]||null;}},()=>{},'vi',null,
  {getItem(){return null},setItem(){}}
 );
 const success=win.__test.execute();
 return {success,copies,deleted,undo,frames,pageCount:pages.length,unit:doc.Unit,api:win.__test};
}
const print=scenario('pages',9,null);
assert.equal(print.success,true);
assert.equal(print.pageCount,9);
assert.equal(print.copies,9);
assert.equal(print.deleted,9);
assert.equal(print.unit,4);
const fail=scenario('pages',9,4);
assert.equal(fail.success,false);
assert.equal(fail.deleted,0);
assert.equal(fail.undo,1);
assert.equal(fail.unit,4);
const roll=scenario('pack',9,null);
assert.equal(roll.success,true);
assert.equal(roll.copies,0);
assert.equal(roll.deleted,0);
assert.ok(roll.frames>=1);
assert.equal(roll.unit,4);
const items=Array.from({length:9},(_,i)=>({index:i,w:90,h:150,area:13500,shape:{}}));
const result=roll.api.choose(items,{usableW:580,usableH:2000,gap:5,rotate:true});
assert.equal(result.bins.length,1);
assert.ok(result.total<=300);
assert.equal(roll.api.group({Shapes:{Count:2}}),true);
assert.equal(roll.api.group({Shapes:{Count:0}}),false);
console.log('PASS: 9 independent groups -> 9 pages, rollback, roll pack, safe Group guard');
