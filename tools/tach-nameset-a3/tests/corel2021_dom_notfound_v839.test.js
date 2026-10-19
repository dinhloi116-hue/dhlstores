// Run: node tools/tach-nameset-a3/tests/corel2021_dom_notfound_v839.test.js
// Regression for CorelDRAW 2021 MSHTML NotFoundError when opening DHL V8.38.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/V838_DIRECT_GROUPS.html'),'utf8');
let code=html.match(/<script[^>]*>([\s\S]*?)<\/script>/i)[1];
code=code.replace('window.DHLDirectGroups={run:execute','window.DHLDirectGroups={form:form,run:execute');
function node(id){
 return {id,parentNode:null,onchange:null,onclick:null,_value:'pack',
  set value(v){this._value=v;},get value(){return this._value;},
  addEventListener(){},innerHTML:''};
}
const found={};
const card=node('v77NestCard');found[card.id]=card;
const actionRow=node('v77-grid2');actionRow.parentNode=card;
const wrapper=node('button-column');wrapper.parentNode=actionRow;
const nestedButton=node('v77NestBtn');nestedButton.parentNode=wrapper;found[nestedButton.id]=nestedButton;
card.insertBefore=function(child,reference){
 // An MSHTML/DOM insertBefore may only target a *direct* child of the parent.
 if(reference.parentNode!==this)throw Error('NotFoundError');
 this.inserted=child;this.ref=reference;child.parentNode=this;
};
card.appendChild=function(child){this.inserted=child;child.parentNode=this;};
const document={
 getElementById(id){return found[id]||null;},
 createElement(){
  const n=node(''), descriptor=Object.getOwnPropertyDescriptor(n,'innerHTML');
  Object.defineProperty(n,'id',{get(){return this._id;},set(v){this._id=v;found[v]=this;}});
  Object.defineProperty(n,'innerHTML',{get(){return this._html||'';},set(v){
   this._html=v;
   for(const [,id] of v.matchAll(/id="([^"]+)"/g)){
    const child=node(id);child.parentNode=this;found[id]=child;
   }
  }});
  return n;
 }
};
const window={addEventListener(){}};
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',code)(
 window,document,()=>{},'vi',null,{getItem(){return null;},setItem(){}}
);
assert.equal(window.DHLDirectGroups.form(),true);
assert.equal(card.ref,actionRow,'reference is an immediate child of card');
assert.equal(card.inserted.id,'v838DirectGroups');
assert.equal(window.DHLDirectGroups.form(),true,'reopen is idempotent');
console.log('PASS: Corel 2021 NotFoundError prevented when loading direct-group UI');
