// node tools/tach-nameset-a3/tests/nameset_independent_rows_v856.test.js
// 3 independent line toggles, editable text colors and outlines, no legacy global color panel.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const html=fs.readFileSync(path.join(root,'V854_NAMESET_COMPOSER.html'),'utf8');
const release=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.56/);
assert.ok(release.includes(html.trim()));
assert.equal((release.match(/id="dhl-v854-composer"/g)||[]).length,1);
for(const key of ['Name','Number','Footer']){
 for(const part of ['Enabled','Fill','Stroke','StrokeMm','FillPreview','StrokePreview','FillPalette','StrokePalette']){
  assert.ok(html.includes("v854'+k+'"+part) || html.includes("'v854'+prefix+'"+part) || html.includes("v854'+k+kind") || (part==='Enabled'&&html.includes("'v854'+k+'Enabled'")),key+' '+part);
 }
}
assert.ok(!html.includes('id="v854Fill"'),'global shared color controls must be gone');
const fields={};const created=[];let undo=0,groups=0;
function field(id,v,checked){const opts=[];opts.add=o=>opts.push(o);
 return fields[id]={id,value:v===undefined?'':String(v),checked:!!checked,className:'',innerHTML:'',
 options:opts,remove(i){opts.splice(i,1);},style:{}};}
for(const [k,values] of Object.entries({
 Name:{Text:'MESSI',Font:'Arial',W:'20',H:'5',Fill:'#FF0000',Stroke:'#000000',StrokeMm:'1.5'},
 Number:{Text:'10',Font:'Arial Black',W:'12',H:'25',Fill:'#0000FF',Stroke:'#FFFFFF',StrokeMm:'3.5'},
 Footer:{Text:'FINAL 2026',Font:'Roboto',W:'15',H:'2',Fill:'#F2CE25',Stroke:'#101010',StrokeMm:'0.5'}
}))for(const [suffix,value] of Object.entries(values))field('v854'+k+suffix,value);
field('v854NameEnabled','',true);field('v854NumberEnabled','',true);field('v854FooterEnabled','',true);
field('v854Gap1','3');field('v854Gap2','1');field('v854Mirror','',false);
field('v854Logo','',false);
const d={Unit:4,BeginCommandGroup(){},EndCommandGroup(){},Undo(){undo++;}};
function shape(text){const s={Name:'',Text:{Story:{Text:text,Font:''}},CenterX:0,CenterY:0,SizeWidth:70,SizeHeight:30,
 SetSize(w,h){this.SizeWidth=w;this.SizeHeight=h;},Fill:{UniformColor:{RGBAssign(...xs){s.fillColor=xs;}}},
 Outline:{Width:0,Color:{RGBAssign(...xs){s.outlineColor=xs;}},SetNoOutline(){s.noOutline=true;}}};
 created.push(s);return s;}
const group={Name:'',CreateSelection(){},Flip(){}};
const app={ActiveDocument:d,ActivePage:{CenterX:100,CenterY:300,ActiveLayer:{CreateArtisticText(x,y,t){return shape(t);}}},ActiveWindow:{Refresh(){}},
 CreateShapeRange(){const arr=[];return{Add(s){arr.push(s);},Group(){groups++;group.shapes=arr.slice();return group;}};}};
const win={external:{Application:app},addEventListener(){},
 applyFontRecursive(s,font){s.Text.Story.Font=font;return true;},
 DHLNumberLogo:{settings(){return{on:false,pct:9,bottom:2,inset:1,mode:'per'};},configure(){},available(){return false;}}};
const storage={data:{},getItem(k){return this.data[k]||null;},setItem(k,v){this.data[k]=v;}};
const document={getElementById(k){return fields[k]||null;},createElement(){return{};}};
const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
new Function('window','document','currentLang','localStorage','setTimeout','corelApp','Option',script)(
 win,document,'vi',storage,()=>{},()=>app,function Option(text,value){this.text=text;this.value=value;});
const composer=win.DHLNamesetComposer;
let p=composer.read();
assert.equal(p.name.fill,'#FF0000');assert.equal(p.number.fill,'#0000FF');assert.equal(p.footer.fill,'#F2CE25');
assert.equal(p.name.strokeMm,1.5);assert.equal(p.number.strokeMm,3.5);assert.equal(p.footer.strokeMm,.5);
composer.make(p);
assert.equal(group.shapes.length,3);
assert.deepEqual(created[0].fillColor,[0,0,255]);
assert.deepEqual(created[1].fillColor,[255,0,0]);
assert.deepEqual(created[2].fillColor,[242,206,37]);
assert.equal(created[0].Outline.Width,3.5);
assert.equal(created[1].Outline.Width,1.5);
assert.equal(created[2].Outline.Width,.5);
assert.equal(d.Unit,4);assert.equal(undo,0);
fields.v854NameEnabled.checked=false;fields.v854FooterEnabled.checked=false;
fields.v854NameFill.value='#INVALID';fields.v854FooterH.value='bad';
p=composer.read();
assert.equal(p.name,null);assert.equal(p.footer,null);
assert.ok(p.number);
created.length=0;composer.make(p);
assert.equal(group.shapes.length,1,'only enabled number created');
assert.deepEqual(created[0].fillColor,[0,0,255]);
fields.v854NumberEnabled.checked=false;fields.v854FooterEnabled.checked=true;
fields.v854FooterH.value='2';fields.v854FooterText.value='FINAL';fields.v854FooterFill.value='#00FF00';
p=composer.read();assert.equal(p.name,null);assert.equal(p.number,null);
created.length=0;composer.make(p);
assert.equal(group.shapes.length,1,'third-only nameset creates one object');
assert.deepEqual(created[0].fillColor,[0,255,0]);
fields.v854FooterEnabled.checked=false;
assert.throws(()=>composer.read(),/ít nhất một|at least one/i,'all unchecked is rejected');
fields.v854NumberEnabled.checked=true;fields.v854NumberText.value='';
assert.throws(()=>composer.read(),/có nội dung|needs text/i,'checked empty row is rejected');
fields.v854NumberText.value='10';fields.v854Logo.checked=true;fields.v854NumberEnabled.checked=false;fields.v854FooterEnabled.checked=true;
assert.throws(()=>composer.read(),/chèn logo|enable NUMBER/i,'no digit logo without enabled number');
console.log('PASS V8.56: 3 independent checkboxes, 3 color/outline sets, only enabled artwork, third-only, safe missing inputs');
