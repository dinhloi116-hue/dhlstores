// node tools/tach-nameset-a3/tests/unified_mixed_v848.test.js
// Pure JS Corel mocks: 26 selected Groups and loose objects must use ONE engine.
// Closed counters are forbidden; open notches are usable; rollback and cm/mm safe.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../src');
const ui=fs.readFileSync(path.join(dir,'DockerUI_CURRENT.html'),'utf8');
const geo=fs.readFileSync(path.join(dir,'V826_TRUE_CONTOUR_NEST.html'),'utf8').match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
const direct=fs.readFileSync(path.join(dir,'V838_DIRECT_GROUPS.html'),'utf8').match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
const simple=fs.readFileSync(path.join(dir,'V846_SIMPLE_NEST_UI.html'),'utf8');
assert.ok(ui.includes('DHL_UI_VERSION=8.54'));
assert.ok(!simple.match(/function run\(\)\{[\s\S]*?function undo\(\)\{/) [0].includes('V77NestSelected'),'quick panel never routes back to legacy nesting');
let frames=0,undos=0,optimized=0;
const shapes=Array.from({length:26},(_,i)=>({
 Name:'PRINT_'+i,SizeWidth:22+i%6*8,SizeHeight:34+i%7*8,CenterX:35+(i%5)*100,CenterY:600-Math.floor(i/5)*100,
 ...(i%4===0?{Shapes:{Count:1,Item(){return{SizeWidth:45,SizeHeight:55}}}}:{}),
 Rotate(){},Flip(){}
}));
const app={ActiveDocument:{Unit:4,BeginCommandGroup(){},EndCommandGroup(){},Undo(){undos++;}},
 ActivePage:{CenterX:290,CenterY:10000,ActiveLayer:{CreateRectangle2(){frames++;return{Fill:{ApplyNoFill(){}},Outline:{Color:{CMYKAssign(){}}},OrderToBack(){}};}}},
 ActiveWindow:{Refresh(){}},
 ActiveSelectionRange:{Count:shapes.length,Item(i){return shapes[i-1];}}};
const result={innerHTML:'',className:''};
const fields={v77NestW:{value:'58'},v77NestH:{value:'2000'},v77NestGap:{value:'.5'},
 v77MarginT:{value:'0'},v77MarginB:{value:'0'},v77MarginL:{value:'0'},v77MarginR:{value:'0'},
 v77FrameGapInput:{value:'0'},v838Rotate:{value:'auto'},v838Mode:{value:'pack'},
 v838Contour:{checked:true},v832AllowLoose:{checked:false},v838Mirror:{value:'no'},
 v838Order:{value:'visual'},v845Effort:{value:'deep'},v838DirectMsg:result};
const win={addEventListener(){},external:{Application:app},
 DHLDeepContourSearch:{optimize(items,c,baseline){
  optimized++;
  assert.equal(items.length,26);
  assert.equal(c.W,580);assert.equal(c.H,20000);assert.equal(c.gap,5);
  assert.equal(c.allowLoose,true);
  assert.equal(c.deepMode,'deep');
  return baseline;
 }}};
const doc={getElementById(id){return fields[id]||null;}};
new Function('window','document','setTimeout','currentLang','corelApp',geo)(win,doc,()=>{},'vi',()=>app);
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',direct)(win,doc,()=>{},'vi',()=>app,{getItem(){return null;}});
const original=shapes.map(s=>[s.CenterX,s.CenterY,s.SizeWidth,s.SizeHeight,s.Name]);
assert.equal(win.DHLDirectGroups.run(),false,'mixed selection is blocked without explicit loose opt-in');
assert.equal(frames,0);assert.equal(undos,0);
fields.v832AllowLoose.checked=true;
assert.equal(win.DHLDirectGroups.run(),true,'all 26 shapes use same contour-capable route');
assert.equal(optimized,1);
assert.equal(frames,1);
assert.equal(undos,0);
assert.equal(app.ActiveDocument.Unit,4,'Corel units are restored');
assert.match(result.innerHTML,/26 đối tượng/);
for(let i=0;i<shapes.length;i++){
 assert.equal(shapes[i].SizeWidth,original[i][2]);
 assert.equal(shapes[i].SizeHeight,original[i][3]);
 assert.equal(shapes[i].Name,original[i][4]);
}
const geoDebug=geo.replace(/\}\)\(\);\s*$/,'window.__t={pack,planDepth,anchors,pointInLeaf,valid};})();');
const w={addEventListener(){},DHL_ORDER:'area',DHL_SEARCH_DEADLINE:0};
new Function('window','document','setTimeout','currentLang','corelApp',geoDebug)(w,doc,()=>{},'vi',()=>app);
const G=w.__t;
function rect(l,r,t,b){return{closed:true,pts:[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}],bb:{l,r,t,b,w:r-l,h:b-t}};}
function item(x,y,loops){const a={w:x,h:y,area:x*y,leaves:[{loops,bb:{l:0,r:x,t:0,b:y,w:x,h:y}}]};a.anchors=G.anchors(a);return a;}
const hole=[rect(0,100,0,100),rect(30,70,30,70)];
const holePack=G.pack([item(100,100,hole),item(15,15,[rect(0,15,0,15)])],100,160,2);
assert.ok(holePack&&G.planDepth(holePack)>100,'closed zero/6/8/9-like counters stay forbidden');
const L=[{closed:true,pts:[{x:0,y:0},{x:80,y:0},{x:80,y:20},{x:20,y:20},{x:20,y:80},{x:0,y:80}],bb:{l:0,r:80,t:0,b:80,w:80,h:80}}];
const notch=G.pack([item(80,80,L),item(25,25,[rect(0,25,0,25)])],80,150,2);
assert.ok(notch&&G.planDepth(notch)<=80.01,'open concavity can be used');
for(let i=0;i<notch.length;i++)assert.ok(G.valid(notch[i].x,notch[i].y,notch[i].item,notch.slice(0,i),80,150,2));
console.log('PASS V8.48: 26 mixed objects share contour engine, explicit opt-in, safe group boundaries, closed-hole guard, open-pocket fill');
