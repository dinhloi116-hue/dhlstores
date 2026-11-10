// node tools/tach-nameset-a3/tests/open_gap_v843.test.js
// True-contour regression: a small logo may enter an OPEN notch; it may never
// enter a fully closed glyph counter (0/6/8/9). This test needs no CorelDRAW.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../src');
const geom=fs.readFileSync(path.join(dir,'V826_TRUE_CONTOUR_NEST.html'),'utf8');
const direct=fs.readFileSync(path.join(dir,'V838_DIRECT_GROUPS.html'),'utf8');
const current=fs.readFileSync(path.join(dir,'DockerUI_CURRENT.html'),'utf8');
let js=geom.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
js=js.replace(/\}\)\(\);\s*$/,'window.__test={pack,planDepth,anchors,pointInLeaf};})();');
const window={addEventListener(){},DHL_ORDER:'area',DHL_SEARCH_DEADLINE:0};
new Function('window','document','setTimeout','currentLang','corelApp',js)(
 window,{getElementById(){return null}},()=>{},'vi',null);
const G=window.__test;
function rect(l,r,t,b){return{closed:true,pts:[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}],bb:{l,r,t,b,w:r-l,h:b-t}};}
function item(w,h,loops){const x={w,h,area:w*h,shape:{},leaves:[{loops,bb:{l:0,r:w,t:0,b:h,w,h}}]};x.anchors=G.anchors(x);return x;}
const ring=[rect(0,100,0,100),rect(30,70,30,70)];
assert.equal(G.pointInLeaf({x:50,y:50},{loops:ring},0,0),true,'closed hole is solid');
const blocked=G.pack([item(100,100,ring),item(15,15,[rect(0,15,0,15)])],100,160,2);
assert.ok(blocked&&G.planDepth(blocked)>100,'cannot put logo inside fully enclosed hole');
const notch=[{closed:true,pts:[{x:0,y:0},{x:80,y:0},{x:80,y:20},{x:20,y:20},{x:20,y:80},{x:0,y:80}],bb:{l:0,r:80,t:0,b:80,w:80,h:80}}];
assert.equal(G.pointInLeaf({x:50,y:50},{loops:notch},0,0),false,'open notch is free');
const nested=G.pack([item(80,80,notch),item(25,25,[rect(0,25,0,25)])],80,150,2);
assert.ok(nested&&G.planDepth(nested)<=80.01,'small object fits inside open notch');
assert.ok(direct.includes('function refineGroupContour('),'Group pack supports true contour');
assert.ok(direct.includes('id="v838Contour"'),'Group pack has contour checkbox');
assert.ok(current.includes('DHL_UI_VERSION=8.55'),'current release version is V8.45');
assert.ok(current.includes("W=N('v77NestW',580)"),'contour dimensions match UI millimetres');
assert.ok(!geom.includes("W=N('v77NestW',58)*10"),'active true-contour module uses millimetres (historical fallback scripts are separate)');
assert.ok(current.includes('Closed internal counters are SOLID'),'solid hole policy bundled');
for(const [i,tag] of [...current.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){
 assert.doesNotThrow(()=>new Function(tag[1]),'Corel HTML script '+i+' compiles');
}
console.log('PASS V8.43: open pocket permitted, closed counters excluded; Group mode and snapshot valid');
