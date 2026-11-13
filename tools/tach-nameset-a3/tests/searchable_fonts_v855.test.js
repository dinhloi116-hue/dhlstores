// node tools/tach-nameset-a3/tests/searchable_fonts_v855.test.js
// Mock for CorelDRAW/MSHTML; installed fonts are read from Windows on real machines.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const moduleHtml=fs.readFileSync(path.join(root,'V854_NAMESET_COMPOSER.html'),'utf8');
const release=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.57/);
assert.ok(release.includes(moduleHtml.trim()),'release must embed exactly the current module');
assert.match(moduleHtml,/id="v854'\+k\+'Search"/,'each line gets a search box');
assert.match(moduleHtml,/id="v854'\+k\+'Matches"/,'each line gets a matching-results list');
assert.match(moduleHtml,/InstalledFontCollection/,'Windows font enumeration');
assert.ok(!/var command\s*=.*\^\|/.test(moduleHtml),'font loader command must not use legacy pipeline escaping');
const script=moduleHtml.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)[1];
let shellCalls=[];
function Option(text,value){this.text=text;this.value=value;}
const fields={};
function element(id,v){
 const opts=[];opts.add=function(o){opts.push(o);};
 return fields[id]={id,value:v||'',className:'',innerHTML:'',options:opts,
  remove(i){this.options.splice(i,1);},
  children:[],get firstChild(){return this.children[0]||null;},
  appendChild(b){this.children.push(b);},removeChild(b){this.children.splice(this.children.indexOf(b),1);}};
}
for(const k of ['Name','Number','Footer']){
 element('v854'+k+'Font','Arial');element('v854'+k+'Search','');
 element('v854'+k+'Matches','');element('v854'+k+'Recent','');
}
element('v854FontCount','');element('v854Report','');
const document={
 getElementById(id){return fields[id]||null;},
 createElement(tag){return{tagName:tag,innerHTML:'',className:'',type:'',onclick:null};}
};
const fontList='Arial\r\nRoboto\r\nRoboto Condensed\r\nDIN 2014\r\nAdidas World Cup\r\nNike Football\r\nNoto Sans\r\nMontserrat\r\n';
function ActiveXObject(name){
 assert.equal(name,'WScript.Shell');
 return{Exec(cmd){shellCalls.push(cmd);return{
   StdOut:{ReadAll(){return fontList;}},StdErr:{ReadAll(){return '';}},
   ExitCode:0
 };}};
}
const window={addEventListener(){}};
const store={data:{},getItem(k){return this.data[k]||null;},setItem(k,v){this.data[k]=v;}};
new Function('window','document','currentLang','localStorage','setTimeout','corelApp','Option','ActiveXObject',script)(
 window,document,'vi',store,()=>{},()=>{},Option,ActiveXObject);
const api=window.DHLNamesetComposer;
assert.equal(api.version,'8.57');
assert.equal(api.loadFonts(true),8,'8 installed fonts from Windows');
assert.equal(shellCalls.length,1);
assert.ok(shellCalls[0].includes('InstalledFontCollection'));
assert.ok(!shellCalls[0].includes('^|'));
assert.ok(fields.v854NameFont.options.length>=8,'name fonts populated');
assert.ok(fields.v854NumberFont.options.length>=8,'number fonts populated');
assert.ok(fields.v854FooterFont.options.length>=8,'third-line fonts populated');
fields.v854NumberSearch.value='rob';
assert.equal(api.searchFonts('Number'),2);
assert.equal(fields.v854NumberMatches.children.length,3,'search count + two results');
fields.v854NumberMatches.children[1].onclick();
assert.equal(fields.v854NumberFont.value,'Roboto','correct number font selected');
assert.equal(fields.v854NameFont.value,'Arial','name font unchanged');
api.remember(['DIN 2014','Montserrat']);
assert.deepEqual(api.recents(),['DIN 2014','Montserrat']);
assert.deepEqual(JSON.parse(store.data.dhl_v854_recent_fonts),['DIN 2014','Montserrat']);
fields.v854NameSearch.value='no such font';
assert.equal(api.searchFonts('Name'),0,'no match reported');
console.log('PASS V8.57: Windows font enumeration, 3 searchable pickers, substring match, independent selection and 10 recent persistence');
