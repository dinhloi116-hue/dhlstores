import test from 'node:test';import assert from 'node:assert/strict';
import {makeSaleVariants,splitOptions,serializeSkuLines,parseSkuLines,saleSummary} from '../lib/product-input.mjs';
test('color + sale mode generates separate SKU rows without inventing prices or stock',()=>{
 const r=makeSaleVariants({sku:'HOA-01',dimensions:['color','type'],colors:'Hồng\nĐỏ\nHồng',saleTypes:['Làm sẵn','Nguyên liệu DIY']});
 assert.equal(r.rows.length,4);assert.equal(r.variantName1,'Màu sắc');assert.equal(r.variantName2,'Kiểu / loại');
 assert.deepEqual(r.rows[0],{sku:'HOA-01-HONG-LAM-SAN',opt1:'Hồng',opt2:'Làm sẵn',price:'',stock:''});
 assert.equal(new Set(r.rows.map(x=>x.sku)).size,4);
});
test('no checked type never invents a sale type',()=>{const r=makeSaleVariants({sku:'ABC',dimensions:['color'],colors:'Xanh\nĐỏ'});assert.equal(r.rows.length,2);assert.equal(r.rows[0].opt2,'');assert.equal(saleSummary({saleTypes:[]}), '');});
test('three dimensions blocked until user chooses two',()=>assert.throws(()=>makeSaleVariants({sku:'A',dimensions:['color','size','type'],colors:'Xanh',sizes:'M',saleTypes:['Làm sẵn']}),/tối đa 2/));
test('empty options and missing SKU blocked',()=>{assert.throws(()=>makeSaleVariants({sku:'',dimensions:[]}));assert.throws(()=>makeSaleVariants({sku:'X',dimensions:['size'],sizes:''}));});
test('valid rows roundtrip and invalid prices rejected',()=>{let r=makeSaleVariants({sku:'A-1',dimensions:['size'],sizes:'S\nM'}).rows;r[0].price='129000';r[0].stock='4';assert.deepEqual(parseSkuLines(serializeSkuLines(r)),r);assert.throws(()=>parseSkuLines('A | S | | giá | 0'),/Sai giá/);});
test('options are unique and remain in order',()=>assert.deepEqual(splitOptions('L\n S \nL\n M '),['L','S','M']));
