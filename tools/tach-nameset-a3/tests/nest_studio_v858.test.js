// node tools/tach-nameset-a3/tests/nest_studio_v858.test.js
// Models CorelDRAW and the MSHTML popup: the preview must never modify Corel.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/V858_NEST_STUDIO.html'),'utf8');
const release=fs.readFileSync(path.join(__dirname,'../src/DockerUI_CURRENT.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.59/);
assert.ok(release.includes(html.trim()),'release contains current studio module');
assert.equal((release.match(/id="dhl-v858-nest-studio"/g)||[]).length,1);
const js=html.match(/<script id="dhl-v858-nest-studio" type="text\/javascript">([\s\S]*?)<\/script>/)[1];
assert.doesNotThrow(()=>new Function(js));
const fields={},ui={};let timerCalls=0,frames=[],undos=0,begin=0,end=0,changes=0,rotations=0,flips=0;
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
 createElement(tag){return{tagName:tag,innerHTML:'',className:'',onclick:null,type:'button'};}
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
console.log('PASS V8.58: window + SVG candidate preview, safe no-write preview, stale settings rejection, exact apply and Corel command group');
