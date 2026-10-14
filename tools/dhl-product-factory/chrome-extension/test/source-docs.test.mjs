import test from 'node:test';import assert from 'node:assert/strict';
import {readSourceDocument} from '../lib/source-docs.mjs';
import {makeWorkbook} from '../lib/xlsx-lite.mjs';
const docx='UEsDBBQAAAAIANeLTl0Rh6rLTwAAAGsAAAARAAAAd29yZC9kb2N1bWVudC54bWyzKbdKyU8uzU3NK7GzKbdKyk+pBNEFIKIIRJTYOWc83LW0RCEn8+Hu9lKF7Ie79uYq5GWU5qUrZDzcPTkv3UYfpApEFoHJAjAJMUkfyXgAUEsBAhQDFAAAAAgA14tOXRGHqstPAAAAawAAABEAAAAAAAAAAAAAAIABAAAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAABAAEAPwAAAH4AAAAAAA==';
function file(name,buffer){const bytes=Buffer.from(buffer);return {name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)}};
test('local text and CSV documents used as source without network',async()=>{assert.match((await readSourceDocument(file('nguon.txt',Buffer.from('chất liệu PET','utf8')))).text,/PET/);assert.match((await readSourceDocument(file('gia.csv',Buffer.from('vốn,6500','utf8')))).text,/6500/);});
test('reads local DOCX compressed XML source',async()=>{const r=await readSourceDocument(file('source.docx',Buffer.from(docx,'base64')));assert.match(r.text,/kẽm nhung hồng/)});
test('reads local XLSX cells into prompt source',async()=>{const bytes=makeWorkbook([{name:'Dữ liệu',rows:[['Giá vốn','Đồng'],['Kẽm nhung',13000]]}]);const r=await readSourceDocument(file('source.xlsx',bytes));assert.match(r.text,/13000/);assert.match(r.text,/Kẽm nhung/);});
test('unrecognized and oversized files rejected',async()=>{await assert.rejects(readSourceDocument(file('script.js',Buffer.from('alert(1)'))),/Chưa hỗ trợ/);await assert.rejects(readSourceDocument({name:'huge.xlsx',size:6000000,arrayBuffer:async()=>new ArrayBuffer(0)}),/5 MB/);});
