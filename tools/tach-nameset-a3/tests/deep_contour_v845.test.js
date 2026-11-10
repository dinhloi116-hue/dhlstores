// node tools/tach-nameset-a3/tests/deep_contour_v845.test.js
// Corel-independent regression + mock Corel geometry; real CorelDRAW verification remains necessary.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const mod=fs.readFileSync(path.join(root,'V845_DEEP_TRUE_CONTOUR.html'),'utf8');
const shapeSrc=fs.readFileSync(path.join(root,'V826_TRUE_CONTOUR_NEST.html'),'utf8');
const groupSrc=fs.readFileSync(path.join(root,'V838_DIRECT_GROUPS.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
const js=mod.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
assert.ok(ui.includes('DHL_UI_VERSION=8.55'));
assert.ok(ui.includes('id="dhl-v845-deep-contour"'));
assert.ok(ui.includes('id="v845Effort"'));
assert.ok(ui.includes('DHLDeepContourSearch.optimize(items,c,plan)'));
assert.ok(ui.includes('<span class="ver">v8.55</span>'));
const versions=[...ui.matchAll(/\.innerHTML\s*=\s*['"]v(\d+\.\d+)['"]/g)];
assert.ok(versions.length>=20);
for(const v of versions)assert.equal(v[1],'8.55','no older startup version timer: '+v[0]);
for(const [i,b] of [...ui.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())
 assert.doesNotThrow(()=>new Function(b[1]),'Corel MSHTML JavaScript block '+i+' compiles');
function fake(rotate,mode,throws){
 const win={DHL_ORDER:'initial',DHL_SEARCH_DEADLINE:12345},seen=[],source=[{w:60,h:50},{w:20,h:20}];
 win.DHLContourGeometry={
  footprintAt(s,angle){seen.push(angle);return{shape:s,w:s.w,h:s.h,area:s.w*s.h,leaves:[],anchors:[]};},
  pack(a){if(throws)throw Error('Contour unavailable');if(a.length!==2||!a.some(x=>x.ang===270))return null;return a.map((it,i)=>({item:it,x:i*30,y:0}));},
  planDepth(a){return Math.max.apply(null,a.map(p=>p.y+p.item.h));},
  valid(){return true;}
 };
 new Function('window',js)(win);
 const items=source.map((shape,index)=>({shape,index,w:shape.w,h:shape.h,area:shape.w*shape.h}));
 const baseline={bins:[{places:[{item:items[0],x:0,y:0,w:60,h:50,angle:0}],depth:50},
                       {places:[{item:items[1],x:0,y:0,w:20,h:20,angle:0}],depth:20}],total:70};
 const c={usableW:100,usableH:100,gap:2,rotate,deepMode:mode};
 const result=win.DHLDeepContourSearch.optimize(items,c,baseline);
 assert.equal(win.DHL_ORDER,'initial','restore ordering');
 assert.equal(win.DHL_SEARCH_DEADLINE,12345,'restore search deadline');
 assert.ok(result.bins.length<=baseline.bins.length,'cannot regress bin count');
 assert.ok(result.total<=baseline.total,'cannot regress length');
 assert.equal(result.deepInfo.mode,mode);
 assert.ok(result.deepInfo.trials>=0);
 return {seen,result,baseline,api:win.DHLDeepContourSearch};
}
const bal=fake(true,'balanced',false);
assert.equal(bal.result.bins.length,1,'270-degree geometry permits merging two bins');
assert.equal(bal.result.total,50);
for(const a of [0,90,180,270])assert.ok(bal.seen.includes(a),'must examine orientation '+a);
assert.ok(bal.seen.every(a=>[0,90,180,270].includes(a)),'never rotate to arbitrary degrees');
assert.equal(bal.result.deepInfo.framesBefore,2);
assert.equal(bal.result.deepInfo.framesAfter,1);
assert.equal(bal.result.deepInfo.saved,20);
const deep=fake(true,'deep',false);
assert.equal(deep.result.bins.length,1);
const noRot=fake(false,'quick',false);
assert.equal(noRot.result.bins.length,2,'no rotation cannot use 270 degrees');
assert.ok(noRot.seen.every(x=>x===0),'respects locked rotation setting');
const fallback=fake(true,'balanced',true);
assert.equal(fallback.result.bins.length,2,'geometry exceptions keep rectangular baseline');
assert.equal(fallback.result.total,70);
assert.ok(fallback.result.deepInfo.status.includes('Contour unavailable'));
assert.equal(bal.api.timeBudget('quick'),1800);
assert.equal(bal.api.timeBudget('balanced'),6500);
assert.equal(bal.api.timeBudget('deep'),18000);
// Real contour geometry: inside a closed counter is forbidden, but an L-shaped
// OPEN cavity must be accepted with a 2 mm gap.
let geometryJs=shapeSrc.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
geometryJs=geometryJs.replace(/\}\)\(\);\s*$/,'window.__test={pack,planDepth,anchors,pointInLeaf,valid};})();');
const w={addEventListener(){},DHL_ORDER:'area',DHL_SEARCH_DEADLINE:0};
new Function('window','document','setTimeout','currentLang','corelApp',geometryJs)(w,{getElementById(){return null;}},()=>{},'vi',null);
const G=w.__test;
function rect(l,r,t,b){return{closed:true,pts:[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}],bb:{l,r,t,b,w:r-l,h:b-t}};}
function item(width,height,loops){const obj={w:width,h:height,shape:{},area:width*height,leaves:[{loops,bb:{l:0,r:width,t:0,b:height,w:width,h:height}}]};obj.anchors=G.anchors(obj);return obj;}
const ring=[rect(0,100,0,100),rect(30,70,30,70)];
assert.equal(G.pointInLeaf({x:50,y:50},{loops:ring},0,0),true,'closed hole is excluded');
const blocked=G.pack([item(100,100,ring),item(15,15,[rect(0,15,0,15)])],100,160,2);
assert.ok(blocked&&G.planDepth(blocked)>100,'cannot pack into closed holes like 0/6/8/9');
const L=[{closed:true,pts:[{x:0,y:0},{x:80,y:0},{x:80,y:20},{x:20,y:20},{x:20,y:80},{x:0,y:80}],bb:{l:0,r:80,t:0,b:80,w:80,h:80}}];
assert.equal(G.pointInLeaf({x:50,y:50},{loops:L},0,0),false,'open cavity must remain usable');
const packed=G.pack([item(80,80,L),item(25,25,[rect(0,25,0,25)])],80,150,2);
assert.ok(packed&&G.planDepth(packed)<=80.01,'small contour in the L opening');
assert.ok(G.valid(packed[1].x,packed[1].y,packed[1].item,packed.slice(0,1),80,150,2),'true-contour collision test after packing');
console.log('PASS V8.45: 4 angles, effort budgets, improved material usage, safe fallback, blocked closed holes, open gap and 36 compiled scripts');
