import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
import {makeGeminiRequest} from '../lib/core.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
test('source -> analyze -> sale confirmation displayed in that order on product screen',async()=>{
 const html=await readFile(join(root,'panel.html'),'utf8'),start=html.indexOf('<section data-view="input">'),end=html.indexOf('</section>',start),input=html.slice(start,end);
 for(const id of ['shop','photos','sourceDocs','notes','listDrive','analyze','analysisStatus','cost','weightGrams','lengthCm','widthCm','heightCm','saleTypes','variantRows','buildVariants','skuLines'])assert.match(input,new RegExp(`id="${id}"`));
 assert.ok(input.indexOf('id="sourceDocs"')<input.indexOf('id="analyze"'));
 assert.ok(input.indexOf('id="analyze"')<input.indexOf('id="cost"'));
 assert.ok(input.indexOf('id="cost"')<input.indexOf('id="skuLines"'));
 const exportSection=html.slice(html.indexOf('<section data-view="export">'));
 assert.ok(!exportSection.includes('id="cost"'));assert.ok(!exportSection.includes('id="weightGrams"'));
});
test('Gemini prompt receives verified source document text and never fabricates figures',()=>{
 const out=makeGeminiRequest({shop:'STORE MIU MIU',name:'Hoa kẽm nhung',sourceDocuments:[{name:'gia.xlsx',text:'Giá vốn 13000'}]});
 const input=JSON.parse(out.contents[0].parts[0].text);
 assert.equal(input.sourceDocuments[0].name,'gia.xlsx');assert.match(input.sourceDocuments[0].text,/13000/);
 assert.match(out.systemInstruction.parts[0].text,/KHÔNG bịa/);
});
test('UI ships source document parser and binds sale / shipping metadata to export',async()=>{
 const s=await readFile(join(root,'panel.js'),'utf8');
 assert.match(s,/readSourceDocument/);assert.match(s,/makeSaleVariants/);assert.match(s,/parseSkuLines\(text\('skuLines'\)\)/);
 assert.match(s,/buildProductMarkdown/);assert.match(s,/prices:priceInput\(\)/);
 assert.match(s,/sourceDocuments:sourceDocTexts/);
});

test('local Git updater includes all new source parser and variant modules',async()=>{
 const ps=await readFile(join(root,'cap-nhat-tu-git.ps1'),'utf8');
 for(const required of ['lib/product-input.mjs','lib/source-docs.mjs','test/product-input.test.mjs','test/source-docs.test.mjs','test/workflow.test.mjs'])assert.match(ps,new RegExp(required.replace(/\./g,'\\.')));
});

test('existing v0.6 updater can install v0.7 without missing JS imports',async()=>{
 const panel=await readFile(join(root,'panel.js'),'utf8');const ps=await readFile(join(root,'cap-nhat-tu-git.ps1'),'utf8');
 assert.doesNotMatch(panel,/from ['"]\.\/lib\/(?:product-input|source-docs)\.mjs/);
 assert.match(panel,/readSourceDocument.*from ['"]\.\/lib\/core\.mjs/);
 assert.match(ps,/lib\/core\.mjs/);
 const core=await readFile(join(root,'lib/core.mjs'),'utf8');
 assert.match(core,/export async function readSourceDocument/);
 assert.match(core,/export function makeSaleVariants/);
});
