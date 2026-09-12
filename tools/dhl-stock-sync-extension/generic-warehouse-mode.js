(() => {
  'use strict';
  const xlsx=globalThis.DHLXlsxLite;
  const matcher=globalThis.DHLMatchCore;
  const warehouse=globalThis.DHLWarehouseCore;
  if(!xlsx||!matcher||!warehouse||xlsx.__genericWarehouseV1)return;

  function text(value){return String(value==null?'':value).trim();}

  function findHeader(rows){
    for(let ri=0;ri<Math.min(rows.length,12);ri+=1){
      const map=xlsx.headerMap(rows[ri]||[]);
      if(map['Sản phẩm']!=null&&map['Tồn kho']!=null&&map['STT']!=null)return{rowIndex:ri,map,headers:rows[ri]||[]};
    }
    return null;
  }

  // File Quản lý kho trẻ em thường ghi kiểu:
  //   Size 5 (20-25kg), Size 7 (26-29kg), Size 9 (30-34kg),
  //   Size 11 (35-39kg), Size 13 (40-44kg), Size 15 dưới 50kg.
  // Không được normalize cả chuỗi thành SIZE52025KG / SIZE134044KG.
  // Nếu có chữ "Size" + số thì số đó mới là size thật cần đối chiếu với popup nguồn.
  function normalizeWarehouseSize(value){
    const raw=text(value);
    if(!raw)return'';

    const explicit=raw.match(/(?:^|\b)size\s*[:\-]?\s*(\d{1,3})(?=\D|$)/i);
    if(explicit)return matcher.normalizeSize(explicit[1]);

    const numeric=raw.match(/^\s*(\d{1,3})\s*$/);
    if(numeric)return matcher.normalizeSize(numeric[1]);

    return matcher.normalizeSize(raw);
  }

  function parseLabel(label){
    const raw=text(label);
    // Cho phép phần size dài hơn vì size trẻ em có kèm cân nặng trong ngoặc/chữ.
    const hit=raw.match(/\s*\/\s*([^/]{1,48})\s*$/);
    if(!hit)return null;
    const size=normalizeWarehouseSize(hit[1]);
    if(!size)return null;
    let rawName=raw.slice(0,hit.index).trim();
    rawName=rawName.replace(/\s+(?:Không in(?: tên số)?)\s*$/i,'').trim();
    if(!rawName)return null;
    const name=typeof warehouse.canonicalWarehouseName==='function'?warehouse.canonicalWarehouseName(rawName):rawName;
    return{name,rawName,size};
  }

  async function parseGenericWarehouse(buffer){
    const book=await xlsx.readFirstSheet(buffer);
    const rows=book.rows||[];
    const header=findHeader(rows);
    if(!header)return null;

    const productCol=header.map['Sản phẩm'];
    const stockCol=header.map['Tồn kho'];
    const branchRow=rows[Math.max(0,header.rowIndex-1)]||[];
    const branchName=text(branchRow[stockCol]);
    const productsByName=new Map();
    const variants=[];
    let nextProductId=1;

    for(let ri=header.rowIndex+1;ri<rows.length;ri+=1){
      const row=rows[ri]||[];
      const rawProductLabel=text(row[productCol]);
      const parsed=parseLabel(rawProductLabel);
      if(!parsed)continue;
      let product=productsByName.get(parsed.name);
      if(!product){
        product={productId:nextProductId++,name:parsed.name,rawName:parsed.rawName,variants:[],skuBase:'',sizeAttribute:'Size',warehouse:true};
        productsByName.set(parsed.name,product);
      }
      const rowNumber=ri+1;
      const stock=Number(row[stockCol]);
      const record={
        rowIndex:rowNumber,productId:product.productId,variantId:rowNumber,
        name:parsed.name,rawName:parsed.rawName,rawProductLabel,
        sku:'',skuBase:'',size:parsed.size,sizeFromAttribute:parsed.size,sizeFromSku:'',sizeAttribute:'Size',
        currentStock:Number.isFinite(stock)?stock:null,raw:row,warehouse:true
      };
      variants.push(record);
      product.variants.push(record);
    }

    if(!variants.length)throw new Error('File Quản lý kho không có biến thể có dạng “Tên sản phẩm / Size”.');
    const products=[...productsByName.values()];
    for(const product of products)product.sizeSet=[...new Set(product.variants.map(v=>v.size))];
    return{
      inputType:'warehouse',headers:header.headers,headerMap:header.map,headerRowIndex:header.rowIndex+1,rows,
      products,variants,issues:[],sizeResolved:variants.length,sizeTotal:variants.length,
      warehouseStockCol:stockCol,warehouseStockHeader:'Tồn kho',warehouseBranchName:branchName,
      genericSizes:true
    };
  }

  const previous=xlsx.parseSapoExport.bind(xlsx);
  xlsx.parseSapoExport=async function(buffer){
    try{
      const generic=await parseGenericWarehouse(buffer.slice?buffer.slice(0):buffer);
      if(generic)return generic;
    }catch(error){
      // Nếu đúng file kho nhưng lỗi thật thì báo lỗi đó thay vì nuốt dữ liệu.
      try{
        const book=await xlsx.readFirstSheet(buffer.slice?buffer.slice(0):buffer);
        if(findHeader(book.rows||[]))throw error;
      }catch(checkError){
        if(checkError===error)throw error;
      }
    }
    return previous(buffer.slice?buffer.slice(0):buffer);
  };

  globalThis.DHLGenericWarehouse={parseLabel,parseGenericWarehouse,normalizeWarehouseSize};
  xlsx.__genericWarehouseV1=true;
})();
