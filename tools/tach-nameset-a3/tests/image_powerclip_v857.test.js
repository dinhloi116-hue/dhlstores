// node tools/tach-nameset-a3/tests/image_powerclip_v857.test.js
// Simulates Corel 2021/2025 COM API for image import, PowerClip and tiling.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const html=fs.readFileSync(path.join(root,'V857_IMAGE_POWERCLIP.html'),'utf8');
const release=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
const excel=fs.readFileSync(path.join(root,'V86_PATCH.html'),'utf8');
const composer=fs.readFileSync(path.join(root,'V854_NAMESET_COMPOSER.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.57/);
assert.ok(release.includes(html.trim()),'image module embedded in release');
assert.ok(release.includes(composer.trim()),'new composer embedded in release');
assert.match(excel,/DHLImageFill\.apply\(imageSession,nameShape,'name'\)/);
assert.match(excel,/DHLImageFill\.apply\(imageSession,noShape,'number'\)/);
assert.match(excel,/DHLImageFill\.apply\(imageSession,footerShape,'footer'\)/);
assert.match(excel,/DHLImageFill\.finish\(imageSession\)/);
assert.match(composer,/DHLImageFill\.apply\(imageSession,nm,'name'\)/);
assert.match(composer,/DHLImageFill\.apply\(imageSession,n,'number'\)/);
assert.match(composer,/DHLImageFill\.apply\(imageSession,foot,'footer'\)/);
for(const k of ['v857On','v857File','v857Capture','v857Count','v857Name','v857Number','v857Footer'])assert.ok(html.includes(k));
const js=html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
for(const [i,m] of [...release.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())assert.doesNotThrow(()=>new Function(m[1]),'release script '+i);
const cells={};
function input(id,v,checked){return cells[id]={id,value:String(v||''),checked:!!checked,innerHTML:'',className:'',style:{}};}
input('v857On','',true);input('v857Count','5');input('v857Name','',true);
input('v857Number','',true);input('v857Footer','',true);
input('v857File','C:\\images\\pattern.png');input('v857Status','');
let copies=[],imports=0,deleted=0;
const corelDoc={};
function image(w,h){
 return {SizeWidth:w,SizeHeight:h,CenterX:0,CenterY:0,Delete(){deleted++;},
   CopyToLayer(layer){const cp={SizeWidth:w,SizeHeight:h,SetSize(a,b){this.SizeWidth=a;this.SizeHeight=b;},
     set CenterX(x){this.x=x;},get CenterX(){return this.x;},
     set CenterY(y){this.y=y;},get CenterY(){return this.y;},
     AddToPowerClip(shape,mode){assert.equal(mode,0);copies.push({this:this,frame:shape});}};
    return cp;}};
}
const src=image(20,10),selected={Count:1,Item(i){assert.equal(i,1);return src;}};
const layer={Import(file){assert.equal(file,'C:\\images\\pattern.png');imports++;}};
const corel={ActiveDocument:corelDoc,ActiveSelectionRange:selected};
const win={external:{Application:corel},addEventListener(){}};
const doc={getElementById(k){return cells[k]||null;}};
const storage={data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]||null;}};
new Function('window','document','currentLang','corelApp','localStorage','setTimeout',js)(win,doc,'vi',()=>corel,storage,()=>{});
const api=win.DHLImageFill;
assert.equal(api.version,'8.57');const cfg=api.read();
assert.equal(cfg.count,5);assert.equal(cfg.name,true);assert.equal(cfg.number,true);
let session=api.session(corel,layer,cfg);
const text={SizeWidth:100,SizeHeight:200,CenterX:300,CenterY:400,Fill:{ApplyNoFill(){this.noFill=true;}}};
assert.equal(api.apply(session,text,'name'),5);assert.equal(copies.length,5);
assert.equal(imports,1,'only one image import for an Excel batch');
assert.equal(session.used,5);
assert.ok(text.Fill.noFill);
assert.ok(copies.every(c=>c.frame===text));
assert.ok(copies.every(c=>c.this.SizeWidth>0&&c.this.SizeHeight>0));
api.apply(session,text,'number');api.apply(session,text,'footer');
assert.equal(copies.length,15,'3 targets x 5 copies');
api.finish(session);assert.equal(deleted,1,'temporary imported source removed once');
api.finish(session);assert.equal(deleted,1);
cells.v857Name.checked=false;cells.v857Footer.checked=false;
const numberCfg=api.read();session=api.session(corel,layer,numberCfg);
copies=[];assert.equal(api.apply(session,text,'name'),0);
assert.equal(api.apply(session,text,'number'),5);api.abort(session);assert.equal(deleted,2);
cells.v857On.checked=false;assert.equal(api.read().enabled,false);
assert.equal(api.session(corel,layer,api.read()),null);
cells.v857On.checked=true;cells.v857Count.value='0';
assert.throws(()=>api.read(),/1 đến 64/);
cells.v857Count.value='65';assert.throws(()=>api.read(),/1 đến 64/);
cells.v857Count.value='1';cells.v857Number.checked=false;
assert.throws(()=>api.read(),/ít nhất một/);
cells.v857Number.checked=true;cells.v857File.value='C:\\fakepath\\pattern.png';
assert.throws(()=>api.read(),/đường dẫn đầy đủ/);
// Capture an already selected Corel image. The original must never be deleted.
const deletedBefore=deleted,importsBefore=imports;
assert.equal(api.capture(),true);
corelDoc.Name='Test.cdr';
// COM may return a new wrapper for the same document on subsequent calls.
corel.ActiveDocument={Name:'Test.cdr'};
const selectedCfg=api.read();assert.equal(selectedCfg.mode,'selected');
const selectedSession=api.session(corel,layer,selectedCfg);
assert.equal(selectedSession.temp,false);
assert.equal(api.apply(selectedSession,text,'number'),1);
api.finish(selectedSession);
assert.equal(deleted,deletedBefore,'captured Corel source remains intact');
assert.equal(imports,importsBefore,'selected source does not trigger an import');
console.log('PASS V8.57 PowerClip: local image, exact repeat X, 3 independent targets, reuse in batch, cleanup and validation');
