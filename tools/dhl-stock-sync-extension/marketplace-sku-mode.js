(function marketplaceMode(){
  'use strict';

  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const rules=globalThis.DHLShopRules;
  if(!xlsx||!matcher||!rules)return;

  const RESULTS_KEY='dhlCatalogResults';
  const text=(v)=>String(v==null?'':v).trim();
  const plain=(v)=>text(v).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
  const xmlEscape=(v)=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  const standardName=(g)=>g&&g.color&&g.color!=='(không màu)'?`${g.parentName||''} - ${g.color}`:text(g&&g.parentName);

  function candidateHeaders(platform){
    const commonTitle=['tensanpham','productname','producttitle','itemname','tenhanghoa'];
    const productSku=['skusanpham','productsku','parentsku','parentsellersku','parentcode','masanpham'];
    const variantSku=['skuphanloai','variationsku','variantsku','sellersku','shopsku','skunguoiban','maskunguoiban','sku','merchantsku','sellerstockkeepingunit'];
    if(platform==='lazada')variantSku.unshift('sellersku','sellerskucode','sellerskuid','sellerstockkeepingunit');
    return{commonTitle,productSku,variantSku};
  }

  function detectHeader(rows,platform){
    const cand=candidateHeaders(platform);
    let best=null;
    for(let ri=0;ri<Math.min(rows.length,25);ri++){
      const row=rows[ri]||[];
      const norm=row.map(plain);
      let titleCol=-1,productSkuCol=-1,variantSkuCol=-1;
      const skuCols=[];
      for(let ci=0;ci<norm.length;ci++){
        const h=norm[ci];
        if(!h)continue;
        if(titleCol<0&&cand.commonTitle.some(x=>h===x||h.includes(x)))titleCol=ci;
        if(productSkuCol<0&&cand.productSku.some(x=>h===x||h.includes(x)))productSkuCol=ci;
        if(h.includes('sku'))skuCols.push(ci);
        if(variantSkuCol<0&&cand.variantSku.some(x=>h===x||h.includes(x)))variantSkuCol=ci;
      }
      if(variantSkuCol<0&&skuCols.length)variantSkuCol=skuCols.find(ci=>ci!==productSkuCol)??skuCols[0];
      if(productSkuCol===variantSkuCol&&skuCols.length>1)variantSkuCol=skuCols.find(ci=>ci!==productSkuCol)??variantSkuCol;
      let score=0;
      if(titleCol>=0)score+=3;
      if(productSkuCol>=0)score+=2;
      if(variantSkuCol>=0)score+=4;
      if(skuCols.length)score+=1;
      if(!best||score>best.score)best={rowIndex:ri,titleCol,productSkuCol,variantSkuCol,skuCols,score,headers:row};
    }
    if(!best||best.score<4||best.variantSkuCol<0)throw new Error(`Không nhận ra cột SKU của file ${platform==='lazada'?'Lazada':'Shopee'}.`);
    return best;
  }

  function sourceGroups(results){
    return matcher.groupSourceVariants(results||[]).map(g=>{
      const name=standardName(g);
      const alias=text(rules.generatedAliasForStandardName&&rules.generatedAliasForStandardName(name));
      const sizes=[...new Set((g.variants||[]).map(v=>matcher.normalizeSize(v&&v.size)).filter(Boolean))];
      return{...g,name,alias,sizes};
    }).filter(g=>g.alias&&g.sizes.length);
  }

  function rowText(row){return (row||[]).map(text).filter(Boolean).join(' | ');}

  function scoreGroup(identity,g){
    const base=matcher.scoreProductMatch(identity,'',g.parentName,g.color);
    const a=new Set(plain(identity).split(/\s+/).filter(x=>x.length>1));
    const b=new Set(plain(g.name).split(/\s+/).filter(x=>x.length>1));
    let inter=0;for(const x of a)if(b.has(x))inter++;
    const jac=inter/(a.size+b.size-inter||1);
    return Math.max(base,.65*jac+.35*base);
  }

  function matchGroup(identity,groups){
    let best=null,second=null;
    for(const g of groups){
      const score=scoreGroup(identity,g);
      if(!best||score>best.score){second=best;best={g,score};}
      else if(!second||score>second.score)second={g,score};
    }
    const margin=best?best.score-(second?second.score:0):0;
    if(!best||best.score<.40||margin<.015)return null;
    return best.g;
  }

  function regexEscape(value){return String(value).replace(/[.*+?^$()|[\]\\]/g,'\\$&');}

  function extractSize(row,g){
    const sizes=(g&&g.sizes)||[];
    if(!sizes.length)return'';
    for(const cell of row||[]){
      const raw=text(cell),n=matcher.normalizeSize(raw);
      if(sizes.includes(n))return n;
    }
    for(const cell of row||[]){
      const p=text(cell).toUpperCase();
      for(const size of sizes){
        const s=String(size).toUpperCase();
        if(new RegExp(`(?:^|[^A-Z0-9])(?:SIZE\\s*)?${regexEscape(s)}(?:$|[^A-Z0-9])`,'i').test(p))return size;
      }
    }
    return'';
  }

  function inlineCell(ref,value,style){
    const s=style?` s="${style}"`:'';
    return `<c r="${ref}"${s} t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
  }

  function patchCell(xml,rowNumber,colIndex,value){
    const ref=`${xlsx.indexToCol(colIndex)}${rowNumber}`;
    const rowRe=new RegExp(`<row\\b([^>]*)\\br="${rowNumber}"([^>]*)>([\\s\\S]*?)<\\/row>`);
    const rm=xml.match(rowRe);
    if(!rm)return xml;
    const rowFull=rm[0],body=rm[3];
    const cellRe=new RegExp(`<c\\b([^>]*)\\br="${ref}"([^>]*)(?:\\/>|>([\\s\\S]*?)<\\/c>)`);
    const cm=body.match(cellRe);
    let newBody;
    if(cm){
      const attrs=`${cm[1]||''} ${cm[2]||''}`;
      const style=(attrs.match(/\bs="([^"]+)"/)||[])[1]||'';
      newBody=body.replace(cm[0],inlineCell(ref,value,style));
    }else{
      newBody=body+inlineCell(ref,value,'');
    }
    return xml.replace(rowFull,rowFull.replace(body,newBody));
  }

  function buildPatchedWorkbook(book,changes){
    let xml=book.xml;
    for(const ch of changes)xml=patchCell(xml,ch.rowNumber,ch.colIndex,ch.value);
    book.files.set(book.sheetPath,new TextEncoder().encode(xml));
    return xlsx.zipStore(book.files);
  }

  async function standardizeFile(file,platform){
    const stored=await chrome.storage.local.get(RESULTS_KEY);
    const results=Array.isArray(stored[RESULTS_KEY])?stored[RESULTS_KEY]:[];
    if(!results.length)throw new Error('Chưa có dữ liệu nguồn. Hãy chạy BẢO TRÌ NGUỒN / quét sản phẩm trước.');
    const groups=sourceGroups(results);
    if(!groups.length)throw new Error('Dữ liệu nguồn chưa tạo được Đường dẫn/Alias + Size.');

    const buffer=await file.arrayBuffer();
    const book=await xlsx.readFirstSheet(buffer);
    const rows=book.rows||[];
    const header=detectHeader(rows,platform);
    const changes=[];
    let currentTitle='',matchedRows=0,changedProductSku=0,changedVariantSku=0,unmatched=0,missingSize=0;
    const failures=[];

    for(let ri=header.rowIndex+1;ri<rows.length;ri++){
      const row=rows[ri]||[];
      const titleCell=header.titleCol>=0?text(row[header.titleCol]):'';
      if(titleCell)currentTitle=titleCell;
      if(!(row||[]).some(v=>text(v)))continue;

      const identity=`${currentTitle} ${rowText(row)}`.trim();
      if(!identity)continue;
      const group=matchGroup(identity,groups);
      if(!group){
        if(header.variantSkuCol>=0&&text(row[header.variantSkuCol])){
          unmatched+=1;
          failures.push(`Dòng ${ri+1}: không ghép được sản phẩm — ${currentTitle||'(không tên)'}`);
        }
        continue;
      }
      const size=extractSize(row,group);
      if(!size){
        missingSize+=1;
        failures.push(`Dòng ${ri+1}: không xác định được size — ${currentTitle||group.name}`);
        continue;
      }
      matchedRows+=1;
      if(header.productSkuCol>=0){
        changes.push({rowNumber:ri+1,colIndex:header.productSkuCol,value:group.alias});
        changedProductSku+=1;
      }
      if(header.variantSkuCol>=0){
        changes.push({rowNumber:ri+1,colIndex:header.variantSkuCol,value:`${group.alias}-${size}`});
        changedVariantSku+=1;
      }
    }

    if(!changes.length)throw new Error('Không tìm được dòng nào đủ điều kiện chuẩn hóa SKU.');
    if(unmatched||missingSize){
      const sample=failures.slice(0,5).join('\n');
      throw new Error(`Chưa an toàn để xuất: ${unmatched} dòng không ghép được sản phẩm, ${missingSize} dòng thiếu size.\n${sample}`);
    }

    const bytes=buildPatchedWorkbook(book,changes);
    return{bytes,matchedRows,changedProductSku,changedVariantSku,headerRow:header.rowIndex+1};
  }

  function download(bytes,file,platform){
    const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    const base=file.name.replace(/\.xlsx?$/i,'');
    a.href=url;
    a.download=`${base} - SKU CHUAN ${platform.toUpperCase()}.xlsx`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1800);
  }

  function mount(){
    const main=document.querySelector('main');
    if(!main||document.getElementById('marketplaceSkuBox'))return Boolean(main);

    const box=document.createElement('section');
    box.id='marketplaceSkuBox';
    box.style.margin='10px 0';
    box.style.padding='11px';
    box.style.border='1px solid #c4b5fd';
    box.style.borderRadius='10px';
    box.style.background='#f5f3ff';
    box.innerHTML=`
      <b style="display:block;color:#5b21b6">CHUẨN HÓA SKU SÀN — SHOPEE / LAZADA</b>
      <small style="display:block;margin-top:5px;line-height:1.45;color:#475569">
        Dùng kết quả nguồn đã quét. Chỉ sửa cột SKU, mọi cột khác giữ nguyên.
        Quy tắc: SKU sản phẩm = Đường dẫn/Alias; SKU phân loại = Alias + Size.
      </small>
      <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">
        <button id="marketplaceShopeeBtn" type="button" class="secondary" style="flex:1;min-width:130px">FILE SHOPEE → SỬA SKU</button>
        <button id="marketplaceLazadaBtn" type="button" class="secondary" style="flex:1;min-width:130px">FILE LAZADA → SỬA SKU</button>
      </div>
      <input id="marketplaceSkuInput" type="file" accept=".xlsx" style="display:none">
      <small id="marketplaceSkuState" style="display:block;margin-top:7px">Chưa chọn file.</small>
    `;

    const catalog=document.getElementById('catalogMode');
    if(catalog&&catalog.parentElement===main)catalog.insertAdjacentElement('afterend',box);
    else main.appendChild(box);

    const input=box.querySelector('#marketplaceSkuInput');
    const state=box.querySelector('#marketplaceSkuState');
    let platform='shopee';

    async function run(){
      const file=input.files&&input.files[0];
      if(!file)return;
      state.textContent=`Đang chuẩn hóa ${platform==='lazada'?'Lazada':'Shopee'} — chỉ sửa SKU...`;
      try{
        const out=await standardizeFile(file,platform);
        download(out.bytes,file,platform);
        state.textContent=`XONG ${platform.toUpperCase()}: ${out.matchedRows} dòng • SKU SP ${out.changedProductSku} • SKU phân loại ${out.changedVariantSku}. Các cột khác giữ nguyên.`;
        state.style.color='#166534';
      }catch(error){
        state.textContent=`LỖI: ${error&&error.message||String(error)}`;
        state.style.color='#b91c1c';
      }finally{
        input.value='';
      }
    }

    box.querySelector('#marketplaceShopeeBtn').addEventListener('click',()=>{platform='shopee';input.click();});
    box.querySelector('#marketplaceLazadaBtn').addEventListener('click',()=>{platform='lazada';input.click();});
    input.addEventListener('change',run);
    return true;
  }

  function install(){
    if(mount())return;
    const obs=new MutationObserver(()=>{if(mount())obs.disconnect();});
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>obs.disconnect(),10000);
  }

  globalThis.DHLMarketplaceSku={standardizeFile,detectHeader,sourceGroups};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();