// node tools/tach-nameset-a3/tests/nest_studio_v858.test.js
// Models CorelDRAW and the MSHTML popup: the preview must never modify Corel.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/V858_NEST_STUDIO.html'),'utf8');
const release=fs.readFileSync(path.join(__dirname,'../src/DockerUI_CURRENT.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.60/);
assert.ok(release.includes(html.trim()),'release contains current studio module');
assert.equal((release.match(/id="dhl-v858-nest-studio"/g)||[]).length,1);
const js=html.match(/<script id="dhl-v858-nest-studio" type="text\/javascript">([\s\S]*?)<\/script>/)[1];
assert.doesNotThrow(()=>new Function(js));
const fields={},ui={};let timerCalls=0,frames=[],undos=0,begin=0,end=0,changes=0,rotations=0,flips=0,duplicates=0;
function field(k,value){return fields[k]={id:k,value:String(value===undefined?'':value),checked:false,
   innerHTML:'',className:'',children:[],appendChild(s){this.children.push(s);},
   set style(s){this._style=s;},get style(){return this._style||{};}};}
field('v846W',21);field('v846H',29.7);field('v846Gap',.3);field('v849Top',0);
field('v849Bottom',0);field('v849Left',0);field('v849Right',0);field('v849FrameGap',1);
field('v846Loose',0);field('v846Rotate',0).checked=true;field('v846Contour',0);
field('v846Deep',0);field('v849Mirror','no');field('v858Status','');
function shape(w,h,x,y,i){
 let pos={x:x,y:y};
 return{SizeWidth:w,SizeHeight:h,Name:'G'+i,Shapes:{Count:1},get CenterX(){return pos.x},
 set CenterX(v){changes++;pos.x=v;},get CenterY(){return pos.y;},set CenterY(v){changes++;pos.y=v;},
 Duplicate(dx,dy){assert.equal(dx,0);assert.equal(dy,0);duplicates++;
  return shape(this.SizeWidth,this.SizeHeight,this.CenterX,this.CenterY,'COPY-'+i+'-'+duplicates);},
 Rotate(angle){rotations++;if(angle===90){let k=this.SizeWidth;this.SizeWidth=this.SizeHeight;this.SizeHeight=k;}},
 Flip(){flips++;}};
}
const shapes=[shape(30,40,0,0,1),shape(40,30,80,100,2),shape(20,30,140,25,3)];
let doc={Unit:4,Name:'Test.cdr',FullFileName:'C:\\Work\\Test.cdr',BeginCommandGroup(){begin++;},EndCommandGroup(){end++;},Undo(){undos++;}};
const page={CenterX:100,CenterY:90,ActiveLayer:{CreateRectangle2(x,y,w,h){
 frames.push({x,y,w,h});
 return{Name:'',Fill:{ApplyNoFill(){}},Outline:{Width:0},OrderToBack(){}};}}};
const corel={ActiveDocument:doc,ActivePage:page,Optimization:false,
 ActiveWindow:{Refresh(){}},ActiveSelectionRange:{Count:3,Item(i){return shapes[i-1];}}};
function fp(s){const w=s.SizeWidth,h=s.SizeHeight,bb={l:0,t:0,r:w,b:h,w,h},pts=[{x:0,y:0},{x:w,y:s._modified?2:0},{x:w,y:h},{x:0,y:h}];
 return{shape:s,w,h,area:w*h,leaves:[{bb,loops:[{closed:true,pts,bb}]}],anchors:pts};}
const popupFields={};
const popupDocument={
 open(){},close(){},markup:'',
 write(str){this.markup=str;for(const m of str.matchAll(/id="([^"]+)"/g)){
   const id=m[1],isChk=m[0].indexOf('checkbox')>=0;
   popupFields[id]={id,value:'',checked:false,innerHTML:'',className:'',disabled:false,children:[],
   appendChild(x){this.children.push(x);},set style(s){this._style=s;}};}},
 getElementById(id){return popupFields[id]||null;},
 createElement(tag){return{tagName:tag,innerHTML:'',className:'',onclick:null,type:'button',value:'',children:[],
  appendChild(el){this.children.push(el);}};}
};
let popup=null;
const win={
 external:{Application:corel},addEventListener(){},
 open(url,name,features){popup={closed:false,document:popupDocument,close(){this.closed=true;},focus(){}};return popup;},
 DHLDirectGroups:{runPlan(items,c,kind){
   const ord=items.slice().sort(function(a,b){return kind==='visual'?a.index-b.index:kind==='height'?b.h-a.h:kind==='width'?b.w-a.w:b.area-a.area;});
   let x=0,places=[],bin=0,bins=[];
   for(const it of ord){
    if(x+it.w>c.usableW){bins.push({places,depth:40});places=[];x=0;}
    places.push({item:it,x,y:0,w:it.w,h:it.h,angle:0});x+=it.w+c.gap;
   }
   if(places.length)bins.push({places,depth:40});
   return{bins,total:bins.reduce((a,b)=>a+b.depth,0)};
 }},
 DHLContourGeometry:{footprintAt(s,angle){assert.equal(angle,0);return fp(s);},
 valid(x,y,it,placed,W,H,gap){return placed.every(z=>x>=z.x+z.item.w+gap||z.x>=x+it.w+gap||y>=z.y+z.item.h+gap||z.y>=y+it.h+gap);}
 }};
const mockDoc={getElementById(k){return fields[k]||null;}};
new Function('window','document','corelApp','currentLang','setTimeout',js)(win,mockDoc,()=>corel,'vi',f=>{timerCalls++;});
const studio=win.DHLNestStudio;
const original=shapes.map(s=>[s.CenterX,s.CenterY,s.SizeWidth,s.SizeHeight]);
assert.equal(studio.open(),true,'opens standalone preview');
assert.equal(changes,0,'preview must not move objects');
assert.equal(frames.length,0,'preview must not draw Corel frames');
assert.equal(rotations,0,'preview must not rotate any shape');
assert.equal(doc.Unit,4,'Corel document unit restored after read');
assert.ok(popupDocument.markup.includes('nsCanvas'),'preview includes SVG canvas');
assert.ok(popupDocument.markup.includes('nsTry'),'preview has try alternative button');
let state=studio.getState();assert.ok(state.candidates.length>0&&state.candidates.length<=5);
assert.ok(popupFields.nsCanvas.innerHTML.includes('<svg'));
assert.equal(studio.validate(state.candidates[0].plan,state,state.config,state.candidates[0].contour),true);
const total=state.items.length;
assert.equal(studio.metrics(state,state.config,state.candidates[0]).count,total);
popupFields.nsGap.value='123';
assert.equal(studio.apply(),false,'changing settings invalidates approval');
assert.equal(changes,0);assert.equal(frames.length,0);
popupFields.nsGap.value=String(state.config.gap);
const originalX=shapes[0].CenterX;
shapes[0].CenterX=originalX+2;
assert.equal(studio.apply(),false,'reject moved source after preview');
assert.equal(frames.length,0,'stale source cannot create frames');
shapes[0].CenterX=originalX;
shapes[0]._modified=true;
assert.equal(studio.apply(),false,'reject modified contours with unchanged bounds');
assert.equal(frames.length,0,'changed contour cannot create frames');
shapes[0]._modified=false;
assert.equal(studio.apply(),true,'apply the previewed candidate');
assert.equal(frames.length,state.candidates[0].plan.bins.length);
assert.equal(begin,1);assert.equal(end,1);
assert.equal(undos,0);assert.ok(changes>=total*2);
assert.equal(doc.Unit,4,'unit restored after applying');
assert.ok(popup.closed);
assert.notDeepEqual(shapes.map(s=>[s.CenterX,s.CenterY,s.SizeWidth,s.SizeHeight]),original);
assert.equal(duplicates,0,'default 1 copy per source creates no duplicate');

// PET roll: width only, ignores fixed sheet height and trims the frame to content.
const previousFrameCount=frames.length,previousChanges=changes;
assert.equal(studio.open(),true,'open second session for PET roll');
assert.equal(changes,previousChanges,'second preview still read-only');
assert.ok(popupDocument.markup.includes('nsMaterialMode'),'new material selector present');
popupFields.nsMaterialMode.value='roll';
popupFields.nsMaterialMode.onchange();
assert.equal(popupFields.nsH.disabled,true,'roll mode disables fixed height');
popupFields.nsW.value='580';popupFields.nsH.value='9999';popupFields.nsMargin.value='4';
assert.equal(studio.apply(),false,'cannot apply uncomputed PET settings');
assert.equal(frames.length,previousFrameCount);
assert.equal(studio.recompute(),true,'calculate roll from width only');
state=studio.getState();
assert.equal(state.config.roll,true);
assert.equal(state.config.H,0,'roll has no fixed height');
assert.equal(state.candidates[0].plan.bins.length,1,'continuous roll must be one strip');
const rollMetrics=studio.metrics(state,state.config,state.candidates[0]);
assert.equal(rollMetrics.roll,true);
assert.ok(rollMetrics.rollLength<9999,'roll height derived from content rather than old sheet height');
assert.equal(rollMetrics.rollLength,studio.rollLength(state.candidates[0].plan,state.config));
assert.equal(rollMetrics.rollLength,48,'40 mm content plus 4 mm on both ends');
assert.ok(popupFields.nsCanvas.innerHTML.includes('CUỘN PET'),'preview labels roll');
assert.ok(popupFields.nsStats.innerHTML.includes('CUỘN PET'),'roll stats visible');
assert.equal(changes,previousChanges,'roll computation did not move artwork');
assert.equal(studio.apply(),true,'apply roll dimensions');
assert.equal(frames.length,previousFrameCount+1,'one roll frame');
assert.equal(frames[frames.length-1].w,580,'PET width is exactly 580 mm');
assert.equal(frames[frames.length-1].h,rollMetrics.rollLength,'Corel frame uses calculated roll length');
assert.equal(doc.Unit,4,'Corel document unit restored in roll mode');

// Rotation-only case: item too wide at 0°, fits width after 90°.
const extra=shape(700,100,0,0,50);
const piece={shape:extra,index:0,w:700,h:100,area:70000,fp:fp(extra)};
const rollConfig=studio.config({roll:true,W:580,H:0,gap:3,mt:0,mb:0,ml:0,mr:0,frameGap:10,
 rotate:true,contour:false,mirror:false,seconds:5,effort:'balanced'});
const one={items:[piece]};
const rotated=studio.plan(one,rollConfig,0);
assert.ok(rotated.candidates.length>=1,'rotation fallback gives valid roll');
assert.equal(rotated.candidates[0].plan.bins.length,1);
assert.equal(rotated.candidates[0].plan.bins[0].places[0].angle,90);
assert.equal(studio.validate(rotated.candidates[0].plan,one,rollConfig,false),true);
assert.equal(rotated.candidates[0].length,700);
assert.equal(rotated.candidates[0].plan.bins[0].places[0].w,100);

// Oversize width must fail without drawing or mutating original shapes.
const noRotate=studio.config({roll:true,W:90,H:0,gap:3,mt:0,mb:0,ml:0,mr:0,frameGap:10,
 rotate:false,contour:false,mirror:false,seconds:5,effort:'balanced'});
assert.throws(()=>studio.plan(one,noRotate,0),/rộng hơn cuộn PET/);
// A single item longer than 30 m must be rejected, not silently split.
const oversized=shape(50,30010,0,0,51);
const huge={items:[{shape:oversized,index:0,w:50,h:30010,area:50*30010,fp:fp(oversized)}]};
assert.throws(()=>studio.plan(huge,rollConfig,0),/Không xếp hết vào một cuộn PET dưới 30 m/);


// PER-DESIGN PRINT QUANTITIES, 1/2/3 copies across 3 selected designs.
const beforeQtyFrames=frames.length,beforeQtyChanges=changes,beforeQtyDuplicates=duplicates;
assert.equal(studio.open(),true,'open preview for quantity test');
state=studio.getState();
assert.equal(state.sourceItems.length,3);
assert.equal(state.items.length,3,'default is one copy per source');
assert.equal(duplicates,beforeQtyDuplicates,'preview did not duplicate Corel originals');
assert.ok(popupDocument.markup.includes('nsQuantities'));
assert.equal(popupFields.nsQuantities.children.length,3,'one quantity control per original design');
const inputs=studio.readQuantities(state);
assert.deepEqual(inputs,[1,1,1],'default quantities one');
const qtyControls=popupFields.nsQuantities.children.map(row=>row.children[1]);
assert.equal(qtyControls.length,3);
qtyControls[0].value='2';qtyControls[1].value='3';qtyControls[2].value='1';
assert.equal(studio.apply(),false,'quantity change needs a recompute');
assert.equal(duplicates,beforeQtyDuplicates);
assert.equal(changes,beforeQtyChanges);
assert.equal(studio.recompute(),true,'recompute for per-design quantity');
state=studio.getState();
assert.deepEqual(state.quantities,[2,3,1]);
assert.equal(state.items.length,6,'virtual item count matches all print copies');
assert.equal(state.sourceItems.length,3,'original selection count preserved');
assert.equal(new Set(state.items.map(x=>x.index)).size,6,'virtual indices unique');
assert.equal(state.items.filter(x=>x.copyIndex>0).length,3,'three duplicated copies required');
assert.equal(duplicates,beforeQtyDuplicates,'preview and recompute must not mutate Corel');
assert.equal(changes,beforeQtyChanges,'no movement during recompute');
assert.equal(studio.metrics(state,state.config,state.candidates[0]).count,6);
assert.ok(popupFields.nsStats.innerHTML.includes('6 bản in / 3 mẫu'));
assert.equal(studio.apply(),true,'apply all requested quantities');
assert.equal(duplicates,beforeQtyDuplicates+3,'duplicate exactly 3 physical copies');
assert.equal(frames.length,beforeQtyFrames+state.candidates[0].plan.bins.length);
assert.equal(doc.Unit,4);

// Reject invalid quantity and over-limit before any duplication.
assert.equal(studio.open(),true);
state=studio.getState();
const qtyInputs=popupFields.nsQuantities.children.map(row=>row.children[1]);
qtyInputs[0].value='0';
assert.equal(studio.recompute(),false,'zero quantity rejected');
assert.equal(studio.apply(),false,'invalid quantity not applied');
assert.equal(duplicates,beforeQtyDuplicates+3);
qtyInputs[0].value='1.5';
assert.equal(studio.recompute(),false,'fractional quantity rejected');
qtyInputs[0].value='101';
assert.equal(studio.recompute(),false,'more than 100 copies rejected');
qtyInputs[0].value='100';qtyInputs[1].value='100';qtyInputs[2].value='100';
assert.equal(studio.recompute(),true,'300 copies allowed by validation (and packer if supported)');
const beforeOver=duplicates;
const large=studio.getState();
assert.throws(()=>studio.expandQuantities(large,[100,201,100]),/1 đến 100/);
assert.throws(()=>studio.expandQuantities(large,[100,100,201]),/1 đến 100/);
assert.equal(duplicates,beforeOver);
popup.close();


// 5 design sources × 100 copies exceeds the 400 total transaction cap.
const bulkSources=[0,1,2,3,4].map(i=>({shape:shapes[0],index:i,sourceIndex:i,copyIndex:0,
 w:30,h:40,area:1200,fp:fp(shapes[0]),snapshot:{w:30,h:40,x:0,y:0}}));
assert.throws(()=>studio.expandQuantities({sourceItems:bulkSources},[100,100,100,100,100]),/tối đa 400/);

// A native Corel Duplicate failure must Undo and invalidate the prior plan.
assert.equal(studio.open(),true);
state=studio.getState();
const failInputs=popupFields.nsQuantities.children.map(row=>row.children[1]);
failInputs[0].value='2';
assert.equal(studio.recompute(),true,'compute extra copy before failure simulation');
const previousUndo=undos,previousBegin=begin,previousEnd=end;
const originalDuplicate=shapes[0].Duplicate;
shapes[0].Duplicate=function(){throw new Error('TEST_DUPLICATE_FAILURE');};
assert.equal(studio.apply(),false,'Corel duplication error must not claim success');
shapes[0].Duplicate=originalDuplicate;
assert.equal(undos,previousUndo+1,'Corel Undo called for failed duplication');
assert.equal(begin,previousBegin+1,'transaction opened once');
assert.equal(end,previousEnd+1,'transaction ended once');
assert.equal(studio.getState(),null,'stale plan invalidated after Undo');

console.log('PASS V8.60: 3 quantity controls, virtual preview, Corel-only apply copies, input limits, 400-cap and transaction rollback');
