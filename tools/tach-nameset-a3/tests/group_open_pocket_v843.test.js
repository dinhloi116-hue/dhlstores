// node tools/tach-nameset-a3/tests/group_open_pocket_v843.test.js
// Simulated CorelDRAW: contour mode must tuck a small GROUP into an open notch.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../src');
const geom=fs.readFileSync(path.join(dir,'V826_TRUE_CONTOUR_NEST.html'),'utf8').match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
const direct=fs.readFileSync(path.join(dir,'V838_DIRECT_GROUPS.html'),'utf8').match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1].replace(/\}\)\(\);\s*$/,'window.__test={execute};})();');
function run(contour){
 const fields={v77NestW:{value:'80'},v77NestH:{value:'150'},v77NestGap:{value:'2'},v77MarginL:{value:'0'},v77MarginR:{value:'0'},v77MarginT:{value:'0'},v77MarginB:{value:'0'},v77FrameGapInput:{value:'0'},v838Mode:{value:'pack'},v838Rotate:{value:'none'},v838Order:{value:'visual'},v838Mirror:{value:'no'},v838Contour:{checked:contour},v838DirectMsg:{innerHTML:'',className:''}};
 function makeGroup(w,h,local,cx,cy){
  const pts=local.map(p=>({x:cx-w/2+p[0],y:cy-h/2+p[1]}));
  const sp={Length:200,Closed:true,GetPointPositionAt(t){const n=t*pts.length,i=Math.floor(n),u=n-i,p=pts[i%pts.length],q=pts[(i+1)%pts.length];return{x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u};}};
  const leaf={SizeWidth:w,SizeHeight:h,CenterX:cx,CenterY:cy,DisplayCurve:{SubPaths:{Count:1,Item(){return sp;}}}};
  return{SizeWidth:w,SizeHeight:h,CenterX:cx,CenterY:cy,Shapes:{Count:1,Item(){return leaf;}},Rotate(){}};
 }
 const big=makeGroup(80,80,[[0,80],[80,80],[80,60],[20,60],[20,0],[0,0]],40,40);
 const small=makeGroup(25,25,[[0,25],[25,25],[25,0],[0,0]],100,50);
 let undo=0,frames=0;
 const doc={Unit:4,BeginCommandGroup(){},EndCommandGroup(){},Undo(){undo++;}};
 const page={CenterX:40,CenterY:75,ActiveLayer:{CreateRectangle2(){frames++;return{Fill:{ApplyNoFill(){}},Outline:{Color:{CMYKAssign(){}}},OrderToBack(){}};}}};
 const app={ActiveDocument:doc,ActivePage:page,ActiveWindow:{Refresh(){}},ActiveSelectionRange:{Count:2,Item(i){return[big,small][i-1];}}};
 const win={addEventListener(){},external:{Application:app}};
 const document={getElementById(id){return fields[id]||null;},getElementsByClassName(){return[];}};
 new Function('window','document','setTimeout','currentLang','corelApp',geom)(win,document,()=>{},'vi',null);
 new Function('window','document','setTimeout','currentLang','corelApp','localStorage',direct)(win,document,()=>{},'vi',null,{getItem(){return null;}});
 assert.equal(win.__test.execute(),true);
 assert.equal(frames,1);assert.equal(undo,0);assert.equal(doc.Unit,4);
 return{y:small.CenterY,message:fields.v838DirectMsg.innerHTML};
}
const rectangle=run(false);
const contour=run(true);
assert.ok(contour.y>rectangle.y+10,'small shape must move into the open gap rather than below big bounding box');
assert.match(contour.message,/Đã tận dụng khe mở/);
console.log('PASS V8.43: original box is safe; contour moves small grouped artwork into the large shape’s open notch.');
