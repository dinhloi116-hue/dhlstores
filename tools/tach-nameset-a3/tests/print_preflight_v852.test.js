// node tools/tach-nameset-a3/tests/print_preflight_v852.test.js
// Print preflight is READ ONLY. It reports sampled vector contour proximity,
// open paths, uninspectable rectangle fallbacks, ignores nesting frames, and
// conservatively forbids nesting into a fully enclosed counter.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../src');
const source=fs.readFileSync(path.join(dir,'V852_PRINT_PREFLIGHT.html'),'utf8');
const geo=fs.readFileSync(path.join(dir,'V826_TRUE_CONTOUR_NEST.html'),'utf8');
const release=fs.readFileSync(path.join(dir,'DockerUI_CURRENT.html'),'utf8');
assert.ok(release.includes('DHL_UI_VERSION=8.56'));
assert.equal((release.match(/id="dhl-v852-preflight"/g)||[]).length,1);
assert.ok(source.includes('v852Scope'));
assert.ok(source.includes('v852Pick'));
assert.ok(source.includes('#v846QuickPanel #v852Preflight'));
const dom={},chosen=[],store={},doc={Unit:4,BeginCommandGroup(){throw Error('SCAN MUST NEVER EDIT CDR');}};
function box(name,l,t,w,h,polys){
 const shape={Name:name,SizeWidth:w,SizeHeight:h,CenterX:l+w/2,CenterY:-t-h/2};
 if(polys)shape.DisplayCurve={SubPaths:{Count:polys.length,Item(i){
  const p=polys[i-1],coords=p.points,closed=p.closed;
  return{Closed:closed,Length:2*(w+h),GetPointPositionAt(t){
   const f=t*(closed?coords.length:coords.length-1);
   let j=Math.floor(f),u=f-j;
   if(closed)j%=coords.length;else if(j>=coords.length-1){j=coords.length-2;u=1;}
   const a=coords[j],b=coords[(j+1)%coords.length];
   return{x:shape.CenterX-w/2+a[0]+(b[0]-a[0])*u,y:shape.CenterY+h/2-a[1]-(b[1]-a[1])*u};
  }};
 }}};
 return shape;
}
const polygon=(w,h,left=0,top=0)=>({closed:true,points:[[left,top],[left+w,top],[left+w,top+h],[left,top+h]]});
const rect=(n,l,t,w,h)=>box(n,l,t,w,h,[polygon(w,h)]);
const A=rect('A',0,0,100,100),B=rect('B',103,0,20,20),far=rect('far',400,0,20,20),
      overlap=rect('overlap',95,30,30,30);
const L=box('L',0,0,80,80,[{closed:true,points:[[0,0],[80,0],[80,20],[20,20],[20,80],[0,80]]}]);
const insideNotch=rect('notch detail',35,42,20,20);
const ring=box('number zero',0,0,100,100,[polygon(100,100),polygon(40,40,30,30)]);
const insideCounter=rect('in closed hole',40,40,15,15);
const openPath=box('open path',0,0,100,100,[{closed:false,points:[[0,0],[100,100]]}]);
const unknown=box('raster image',0,0,100,100,null);
const frame=box('DHL_NEST_FRAME_1',0,0,500,1000,null);
const invalid={Name:'invalid shape',SizeWidth:0,SizeHeight:50,CenterX:0,CenterY:0};
let selection=[A,B];
const app={ActiveDocument:doc,
 ActiveSelectionRange:{get Count(){return selection.length;},Item(i){return selection[i-1];}},
 ActivePage:{Shapes:{get Count(){return selection.length;},Item(i){return selection[i-1];}}},
 CreateShapeRange(){return{Add(s){chosen.push(s);},CreateSelection(){store.selection=true;}}}};
const win={addEventListener(){},external:{Application:app}};
const elems={v77NestGap:{value:'.5'},v852Scope:{value:'selection',options:[{text:''},{text:''}]},
 v852Report:{innerHTML:'',className:''},v852Pick:{className:''},v846Go:{},v846QuickPanel:{appendChild(q){elems[q.id]=q;}}};
const element=id=>elems[id]||null;
const page={getElementById:element,createElement(){
 const node={id:'',className:''};
 Object.defineProperty(node,'innerHTML',{set(s){this.html=s;for(const m of s.matchAll(/<\w+[^>]*\bid="([^"]+)"/g)){
  if(!elems[m[1]])elems[m[1]]={id:m[1],innerHTML:'',className:'',value:m[1]==='v852Scope'?'selection':'',
   options:m[1]==='v852Scope'?[{text:''},{text:''}]:undefined};
 }},get(){return this.html||'';}});
 return node;
}};
new Function('window','document','setTimeout','currentLang','corelApp',
 geo.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1])(win,page,()=>{},'vi',()=>app);
new Function('window','document','setTimeout','currentLang','corelApp',
 source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1])(win,page,()=>{},'vi',()=>app);
const pre=win.DHLPrintPreflight;
assert.equal(pre.mount(),true);
assert.ok(elems.v852Preflight);
assert.equal(pre.mount(),true,'idempotent mount');
function scan(shapes,clearance=5){
 win.DHL_RECT_FALLBACKS=0;
 return pre.inspect(shapes,clearance,win.DHLContourGeometry,9000);
}
let r=scan([A,B]);assert.equal(r.spacingCount,1);assert.equal(r.overlapCount,0);
assert.ok(r.spacing[0].dist>2.8&&r.spacing[0].dist<3.2);
r=scan([A,overlap]);assert.equal(r.overlapCount,1);
r=scan([A,far]);assert.equal(r.overlapCount,0);assert.equal(r.spacingCount,0);
r=scan([L,insideNotch]);assert.equal(r.overlapCount,0);assert.equal(r.spacingCount,0);
r=scan([ring,insideCounter]);assert.equal(r.overlapCount,1,'closed counters must be occupied');
r=scan([openPath]);assert.equal(r.open,1);
r=scan([unknown]);assert.equal(r.fallback,1);
assert.ok(!pre.render(r).good,'rectangle fallback cannot be certified safe');
r=scan([unknown,A]);assert.equal(r.estimatedCount,1,'uncertain geometry flagged as estimate');
r=scan([frame,far]);assert.equal(r.ignored,1);assert.equal(r.items,1);
r=scan([invalid,far]);assert.equal(r.invalid.length,1);
assert.ok(r.offenders.includes(invalid),'invalid shapes can be selected for review');
selection=[A,B];doc.Unit=4;let xy=[A.CenterX,A.CenterY,B.CenterX,B.CenterY];
const applied=pre.run();assert.ok(applied);assert.equal(doc.Unit,4);
assert.equal(applied.spacingCount,1);assert.deepEqual(xy,[A.CenterX,A.CenterY,B.CenterX,B.CenterY]);
assert.match(elems.v852Report.innerHTML,/3 mm/);
assert.equal(pre.pick(),true);assert.equal(chosen.length,2);
assert.equal(store.selection,true);
selection=[];assert.equal(pre.run(),null,'empty selection errors without changes');
elems.v852Scope.value='page';selection=[A,far,frame];
assert.ok(pre.run(),'whole page mode works');
assert.equal(doc.Unit,4);
const clean=pre.render(scan([A,far]));assert.equal(clean.good,true);
assert.match(clean.html,/Không phát hiện lỗi/);
assert.ok(!/\.Rotate\(|\.Delete\(|BeginCommandGroup\(/.test(source),
 'preflight must not move or mutate original Corel shapes');
for(const [i,chunk] of [...release.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())
 assert.doesNotThrow(()=>new Function(chunk[1]),'bundled script '+i);
console.log('PASS V8.52: read-only Corel scan, minimum clearance, overlap, open paths, fallbacks, closed counters, frame exclusion, error selection, mm restoration');
