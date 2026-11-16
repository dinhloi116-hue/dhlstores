(function(root,factory){
  const api=factory(root.DHLXlsxLite,root.DHLMatchCore);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLWarehouseCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(xlsx,matcher){
  'use strict';

  function normalizeText(value){return String(value==null?'':value).trim();}
  function plain(value){
    return normalizeText(value).toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function canonicalWarehouseName(value){
    const text=normalizeText(value);
    const p=plain(text);
    if(p==='dt y 2026 hd')return 'ĐT Ý 2026 HD - Xanh Dương';
    if(p==='dt ha lan 2026 hd')return 'ĐT Hà Lan 2026 HD - Trắng';
    if(p.includes('bo quan ao bong da y vang')&&p.includes('world cup 2026'))return 'ĐT Ý 2026 HD - Kem';
    if(p.includes('bo dao nha')&&p.includes('siu')&&p.includes('2026'))return 'ĐT Bồ Đào Nha 2026 HD - Siu';
    return text;
  }

  function warehouseColorHint(name){
    const parts=String(name||'').split(/\s+-\s+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length>=2&&/^(ĐT|CLB)\b/i.test(parts[0]))return parts[parts.length-1];
    return'';
  }

  function parseAdultWarehouseLabel(label){
    const text=normalizeText(label);
    const match=text.match(/\s*\/\s*(S|M|L|XL|XXL)\s*$/i);
    if(!match)return null;
    const size=String(match[1]).toUpperCase();
    let rawName=text.slice(0,match.index).trim();
    rawName=rawName.replace(/\s+(?:Không in(?: tên số)?)\s*$/i,'').trim();
    if(!rawName)return null;
    const name=canonicalWarehouseName(rawName);
    return{name,rawName,size};
  }

  function findWarehouseHeader(rows){
    for(let ri=0;ri<Math.min(rows.length,12);ri++){
      const map=xlsx.headerMap(rows[ri]||[]);
      if(map['Sản phẩm']!=null&&map['Tồn kho']!=null&&map['STT']!=null){
        return{rowIndex:ri,map,headers:rows[ri]||[]};
      }
    }
    return null;
  }

  async function parseWarehouseExport(buffer){
    if(!xlsx||typeof xlsx.readFirstSheet!=='function')throw new Error('Thiếu bộ đọc Excel');
    const book=await xlsx.readFirstSheet(buffer);
    const rows=book.rows||[];
    const header=findWarehouseHeader(rows);
    if(!header)throw new Error('Không nhận ra file Quản lý kho của Sapo');

    const productCol=header.map['Sản phẩm'];
    const stockCol=header.map['Tồn kho'];
    const branchRow=rows[Math.max(0,header.rowIndex-1)]||[];
    const branchName=normalizeText(branchRow[stockCol]);
    const productsByName=new Map();
    const variants=[];
    const issues=[];
    let nextProductId=1;

    for(let ri=header.rowIndex+1;ri<rows.length;ri++){
      const row=rows[ri]||[];
      const rawProductLabel=normalizeText(row[productCol]);
      const parsed=parseAdultWarehouseLabel(rawProductLabel);
      if(!parsed)continue;

      let product=productsByName.get(parsed.name);
      if(!product){
        product={productId:nextProductId++,name:parsed.name,rawName:parsed.rawName,variants:[],skuBase:'',sizeAttribute:'Size',warehouse:true};
        productsByName.set(parsed.name,product);
      }
      const rowNumber=ri+1;
      const stock=Number(row[stockCol]);
      const record={
        rowIndex:rowNumber,
        productId:product.productId,
        variantId:rowNumber,
        name:parsed.name,
        rawName:parsed.rawName,
        rawProductLabel,
        sku:'',
        skuBase:'',
        size:parsed.size,
        sizeFromAttribute:parsed.size,
        sizeFromSku:'',
        sizeAttribute:'Size',
        currentStock:Number.isFinite(stock)?stock:null,
        raw:row,
        warehouse:true
      };
      variants.push(record);
      product.variants.push(record);
    }

    const products=[...productsByName.values()];
    for(const p of products)p.sizeSet=[...new Set(p.variants.map(v=>v.size))];
    if(!variants.length)throw new Error('File Quản lý kho không có biến thể người lớn size S/M/L/XL/XXL');

    return{
      inputType:'warehouse',
      headers:header.headers,
      headerMap:header.map,
      headerRowIndex:header.rowIndex+1,
      rows,
      products,
      variants,
      issues,
      sizeResolved:variants.length,
      sizeTotal:variants.length,
      warehouseStockCol:stockCol,
      warehouseStockHeader:'Tồn kho',
      warehouseBranchName:branchName
    };
  }

  function setCell(xml,rowNumber,col,cellXml){
    const rowRe=new RegExp(`(<(?:[A-Za-z_][\\w.-]*:)?row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/(?:[A-Za-z_][\\w.-]*:)?row>)`);
    let changed=false;
    const next=String(xml||'').replace(rowRe,(whole,open,body,close)=>{
      const ref=`${col}${rowNumber}`;
      const cellRe=new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?c\\b[^>]*\\br="${ref}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?c>)`);
      changed=true;
      return cellRe.test(body)?`${open}${body.replace(cellRe,cellXml)}${close}`:`${open}${body}${cellXml}${close}`;
    });
    return{xml:next,changed};
  }

  function setNumericCell(xml,rowNumber,col,value){
    const ref=`${col}${rowNumber}`;
    return setCell(xml,rowNumber,col,`<c r="${ref}"><v>${Number(value)}</v></c>`);
  }

  async function updateWarehouseWorkbook(buffer,sapoData,inventoryByVariantId){
    if(!xlsx||typeof xlsx.readFirstSheet!=='function')throw new Error('Thiếu bộ đọc Excel');
    if(!sapoData||sapoData.inputType!=='warehouse')throw new Error('Không phải file Quản lý kho Sapo');
    const book=await xlsx.readFirstSheet(buffer);
    let xml=book.xml;
    const stockColIndex=Number(sapoData.warehouseStockCol);
    const stockCol=xlsx.indexToCol(stockColIndex);
    let changed=0,zeroCount=0;

    for(const variant of sapoData.variants||[]){
      const key=String(variant.variantId);
      if(!Object.prototype.hasOwnProperty.call(inventoryByVariantId||{},key))continue;
      const stock=Number(inventoryByVariantId[key]);
      if(!Number.isFinite(stock)||stock<0)throw new Error(`Tồn kho không hợp lệ ở dòng ${variant.rowIndex}`);
      const result=setNumericCell(xml,Number(variant.rowIndex),stockCol,stock);
      if(!result.changed)throw new Error(`Không tìm thấy dòng ${variant.rowIndex} trong file kho`);
      xml=result.xml;
      changed++;
      if(stock===0)zeroCount++;
    }
    if(!changed)throw new Error('Không có biến thể nào đủ điều kiện cập nhật tồn kho');
    book.files.set(book.sheetPath,new TextEncoder().encode(xml));
    return{bytes:xlsx.zipStore(book.files),rows:changed,zeroCount,stockHeader:'Tồn kho'};
  }

  if(matcher&&typeof matcher.buildScanHints==='function'&&!matcher.__warehouseHintsWrapped){
    const originalBuildScanHints=matcher.buildScanHints.bind(matcher);
    matcher.buildScanHints=function(products){
      const list=products||[];
      if(!list.some(p=>p&&p.warehouse===true))return originalBuildScanHints(list);
      const byTeam=new Map();
      for(const p of list){
        const team=matcher.teamOf((p&&p.name)||'');
        if(!team)continue;
        if(!byTeam.has(team))byTeam.set(team,{team,products:[],colors:[]});
        const colorHint=warehouseColorHint(p.name);
        const item={
          productId:p.productId,
          name:p.name||'',
          skuBase:'',
          colorHint,
          sizes:(p.variants||[]).map(v=>matcher.normalizeSize(v.size)).filter(Boolean)
        };
        byTeam.get(team).products.push(item);
        if(colorHint&&!byTeam.get(team).colors.includes(colorHint))byTeam.get(team).colors.push(colorHint);
      }
      return[...byTeam.values()];
    };
    matcher.__warehouseHintsWrapped=true;
  }

  if(xlsx&&typeof xlsx.parseSapoExport==='function'&&!xlsx.__warehouseWrapped){
    const original=xlsx.parseSapoExport.bind(xlsx);
    xlsx.parseSapoExport=async function(buffer){
      try{return await original(buffer.slice?buffer.slice(0):buffer);}catch(originalError){
        try{return await parseWarehouseExport(buffer.slice?buffer.slice(0):buffer);}catch(warehouseError){
          throw originalError;
        }
      }
    };
    xlsx.__warehouseWrapped=true;
  }

  return{normalizeText,plain,canonicalWarehouseName,warehouseColorHint,parseAdultWarehouseLabel,findWarehouseHeader,parseWarehouseExport,updateWarehouseWorkbook};
});