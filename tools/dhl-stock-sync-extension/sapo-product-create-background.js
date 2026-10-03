(() => {
  'use strict';

  const resolver=globalThis.DHLSapoInventoryResolver;
  if(!resolver)return;

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const QUEUE_KEY='dhlSapoProductCreateQueueV1';
  const ALARM='dhl-sapo-product-create-queue';
  const LEGACY_QUEUE_CUTOFF=Date.parse('2026-09-28T06:20:00Z');
  const LIST_PAGE_LIMIT=250;
  const MAX_LIST_PAGES=12;
  const text=(v)=>String(v==null?'':v).trim();
  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  const normSku=(v)=>resolver.normSku(v);

  function storeHost(value){
    let raw=text(value).replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();
    if(raw&&!raw.includes('.'))raw=`${raw}.mysapo.net`;
    if(!/^[a-z0-9][a-z0-9.-]*\.mysapo\.net$/i.test(raw))throw new Error('Tên shop Sapo phải dạng ten-shop.mysapo.net');
    return raw;
  }

  function authHeaders(sapo){
    const key=text(sapo&&sapo.apiKey),secret=text(sapo&&sapo.apiSecret);
    if(!key||!secret)throw new Error('Chưa có API Key / API Secret của Ứng dụng riêng Sapo.');
    return{Authorization:`Basic ${btoa(`${key}:${secret}`)}`,Accept:'application/json','Content-Type':'application/json'};
  }

  function sapoErrorDetail(data,raw){
    const candidate=data&&typeof data==='object'?(data.message||data.error||data.errors||data):raw;
    if(candidate&&typeof candidate==='object'){
      try{return JSON.stringify(candidate).slice(0,500);}catch{return String(candidate).slice(0,500);}
    }
    return text(candidate||raw).slice(0,500);
  }

  async function sapoFetch(sapo,path,{method='GET',body=null}={}){
    const host=storeHost(sapo&&sapo.storeHost);
    const response=await fetch(`https://${host}${path}`,{
      method,
      headers:authHeaders(sapo),
      body:body==null?undefined:JSON.stringify(body)
    });
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{data={raw};}
    if(!response.ok){
      const detail=sapoErrorDetail(data,raw);
      throw new Error(`Sapo HTTP ${response.status}${detail?`: ${detail.slice(0,420)}`:''}`);
    }
    return data||{};
  }

  async function readConfig(){
    const s=await chrome.storage.local.get(CONFIG_KEY);
    const cfg=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    return cfg;
  }

  function httpUrl(value){
    try{const u=new URL(text(value));return /^https?:$/.test(u.protocol)?u.href:'';}catch{return'';}
  }

  function sanitizeProduct(raw){
    const alias=text(raw&&raw.alias);
    const name=text(raw&&raw.name);
    if(!alias||!name)throw new Error('Sản phẩm thiếu alias hoặc tên.');
    const variants=(Array.isArray(raw&&raw.variants)?raw.variants:[]).map(v=>({
      size:text(v&&v.size),
      sku:text(v&&v.sku),
      stock:Number(v&&v.stock),
      imageUrl:httpUrl(v&&v.imageUrl)
    })).filter(v=>v.size&&v.sku&&Number.isFinite(v.stock)&&v.stock>=0);
    const missingImageVariant=variants.find(v=>!v.imageUrl);
    if(missingImageVariant)throw new Error(`${name}: SKU ${missingImageVariant.sku} thiếu link ảnh nguồn.`);
    if(!variants.length)throw new Error(`${name}: không có biến thể Size/SKU/tồn hợp lệ.`);
    const skuSet=new Set();
    for(const v of variants){
      const key=normSku(v.sku);
      if(!key||skuSet.has(key))throw new Error(`${name}: SKU trống hoặc trùng ${v.sku}.`);
      skuSet.add(key);
    }
    const images=[];const seen=new Set();
    for(const candidate of [...(Array.isArray(raw&&raw.images)?raw.images:[]),...variants.map(v=>v.imageUrl)]){
      const url=httpUrl(candidate);
      if(!url||seen.has(url))continue;
      seen.add(url);images.push(url);
      if(images.length>=20)break;
    }
    return{
      alias,name,
      parentId:Number(raw&&raw.parentId)||0,
      color:text(raw&&raw.color),
      sourceUrl:httpUrl(raw&&raw.sourceUrl),
      images,variants,
      productId:0,variantIndex:0,imageIndex:0,imageResults:[],imagesDone:false,
      status:'pending',created:false,adopted:false,error:''
    };
  }

  function productsFrom(data){
    if(Array.isArray(data&&data.products))return data.products;
    if(Array.isArray(data&&data.data))return data.data;
    if(data&&data.data&&Array.isArray(data.data.products))return data.data.products;
    return[];
  }

  function productFrom(data){
    if(data&&data.product&&typeof data.product==='object')return data.product;
    if(data&&data.data&&data.data.product&&typeof data.data.product==='object')return data.data.product;
    if(data&&data.data&&typeof data.data==='object'&&!Array.isArray(data.data))return data.data;
    return null;
  }

  function variantsOf(product){return Array.isArray(product&&product.variants)?product.variants:[];}
  function imagesOf(product){return Array.isArray(product&&product.images)?product.images:[];}

  function expectedSkuSet(item){return new Set((item.variants||[]).map(v=>normSku(v.sku)).filter(Boolean));}
  function productSkuSet(product){return new Set(variantsOf(product).map(v=>normSku(v&&v.sku)).filter(Boolean));}
  function sameExpectedSkus(product,item){
    const expected=expectedSkuSet(item),actual=productSkuSet(product);
    if(expected.size!==actual.size)return false;
    for(const sku of expected)if(!actual.has(sku))return false;
    return true;
  }

  async function findExistingByAlias(sapo,item){
    const q=new URLSearchParams({alias:item.alias,limit:'20',fields:'id,name,alias,tags,variants,images'});
    const data=await sapoFetch(sapo,`/admin/products.json?${q.toString()}`);
    return productsFrom(data).find(p=>text(p&&p.alias)===item.alias)||null;
  }

  function productPayload(item){
    return{
      product:{
        name:item.name,
        alias:item.alias,
        tags:'Nguồn aobongda.net',
        published_on:new Date().toISOString(),
        options:[{name:'Size'}],
        variants:(item.variants||[]).map(v=>({
          option1:v.size,
          sku:v.sku,
          inventory_management:'bizweb',
          inventory_quantity:0,
          inventory_policy:'deny',
          requires_shipping:true
        }))
      }
    };
  }

  async function loadProduct(sapo,productId){
    const data=await sapoFetch(sapo,`/admin/products/${Number(productId)}.json?fields=id,name,alias,tags,variants,images`);
    const product=productFrom(data);
    if(!product||!Number(product.id))throw new Error(`Không đọc lại được sản phẩm Sapo #${productId}.`);
    return product;
  }

  async function createOrAdopt(sapo,item,queue){
    if(Number(item.productId))return loadProduct(sapo,item.productId);
    const existing=await findExistingByAlias(sapo,item);
    if(existing){
      if(!sameExpectedSkus(existing,item))throw new Error(`Alias “${item.alias}” đã tồn tại trên Sapo nhưng bộ SKU khác. Tool không ghi đè.`);
      item.productId=Number(existing.id);
      item.adopted=true;
      if(item.adoptedCounted!==true){
        queue.adopted=Number(queue.adopted||0)+1;
        item.adoptedCounted=true;
      }
      item.status='stock';
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      return existing;
    }
    const data=await sapoFetch(sapo,'/admin/products.json',{method:'POST',body:productPayload(item)});
    const created=productFrom(data);
    if(!created||!Number(created.id))throw new Error(`${item.name}: Sapo không trả về ID sản phẩm sau khi tạo.`);
    item.productId=Number(created.id);
    item.created=true;
    if(item.createdCounted!==true){
      queue.created=Number(queue.created||0)+1;
      item.createdCounted=true;
    }
    item.status='stock';
    // Checkpoint ngay sau POST: sản phẩm đã tồn tại trên Sapo phải được tính là "đã tạo",
    // kể cả ảnh/tồn ở bước sau có lỗi.
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    return created;
  }

  function imageAltMarker(item,index){
    const raw=`DHL:${item.alias}:IMG${index+1}`;
    return raw.slice(0,240);
  }

  function imageSrc(image){
    return httpUrl(image&&(
      image.src||image.url||image.full_path||image.image_url||
      image.original_src||image.product_image_url
    ));
  }

  function imageAlt(image){return text(image&&(image.alt||image.alt_text||image.name));}

  function imageVariantIds(image){
    const raw=image&&(image.variant_ids||image.variantIds||image.variants);
    if(!Array.isArray(raw))return[];
    return raw.map(x=>Number(x&&typeof x==='object'?x.id:x)).filter(Boolean);
  }

  function imageGroups(item){
    const map=new Map();
    for(const variant of item.variants||[]){
      const src=httpUrl(variant&&variant.imageUrl);
      if(!src)continue;
      if(!map.has(src))map.set(src,{src,skus:[]});
      map.get(src).skus.push(text(variant.sku));
    }
    for(const src of item.images||[]){
      const url=httpUrl(src);
      if(url&&!map.has(url))map.set(url,{src:url,skus:[]});
    }
    return [...map.values()];
  }

  async function ensureProductImages(sapo,item,product,queue){
    if(item.imagesDone)return;
    const groups=imageGroups(item);
    if(!groups.length)throw new Error(`${item.name}: không có link ảnh nguồn để đẩy Sapo.`);

    let current=product&&Number(product.id)?product:await loadProduct(sapo,item.productId);
    const bySku=new Map(variantsOf(current).map(v=>[normSku(v&&v.sku),v]));
    const existingImages=imagesOf(current);
    item.imageResults=Array.isArray(item.imageResults)?item.imageResults:[];

    while(Number(item.imageIndex||0)<groups.length){
      const index=Number(item.imageIndex||0);
      const group=groups[index];
      const marker=imageAltMarker(item,index);

      const variantIds=[];
      for(const sku of group.skus){
        const variant=bySku.get(normSku(sku));
        if(!variant||!Number(variant.id))throw new Error(`${item.name}: không tìm thấy variant ID cho ảnh SKU ${sku}.`);
        variantIds.push(Number(variant.id));
      }

      // Nếu worker đã upload ảnh nhưng chết trước checkpoint, hoặc Sapo đã có ảnh gắn đúng bộ variant,
      // nhận lại ảnh đó thay vì upload trùng.
      const existing=existingImages.find(img=>{
        if(imageAlt(img)===marker)return true;
        if(!variantIds.length)return false;
        const bound=new Set(imageVariantIds(img));
        return variantIds.every(id=>bound.has(id));
      });
      if(existing){
        item.imageResults[index]={
          index,src:group.src,marker,
          imageId:Number(existing&&existing.id)||0,
          variantIds,
          reused:true
        };
        item.imageIndex=index+1;
        await chrome.storage.local.set({[QUEUE_KEY]:queue});
        continue;
      }

      const body={image:{src:group.src,alt:marker}};
      if(variantIds.length)body.image.variant_ids=variantIds;
      const data=await sapoFetch(
        sapo,
        `/admin/products/${Number(item.productId)}/images.json`,
        {method:'POST',body}
      );
      const createdImage=data&&(
        data.image||
        (data.data&&data.data.image)||
        (data.data&&typeof data.data==='object'&&!Array.isArray(data.data)?data.data:null)
      );
      item.imageResults[index]={
        index,src:group.src,marker,
        imageId:Number(createdImage&&createdImage.id)||0,
        variantIds
      };
      item.imageIndex=index+1;
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      await sleep(350);

      // Refresh để lần retry tiếp theo có thể nhận ảnh vừa upload bằng marker.
      current=await loadProduct(sapo,item.productId);
      existingImages.splice(0,existingImages.length,...imagesOf(current));
    }

    item.imagesDone=true;
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
  }

  async function inventoryItemId(sapo,sapoVariant,expected){
    let id=resolver.variantInventoryItemId({variant:sapoVariant});
    if(id)return id;
    const variantId=Number(sapoVariant&&sapoVariant.id);
    if(!variantId)throw new Error(`Không có variant ID cho SKU ${expected.sku}.`);
    try{
      const detail=await sapoFetch(sapo,`/admin/variants/${variantId}.json`);
      id=resolver.variantInventoryItemId(detail);
      if(id)return id;
    }catch{}
    try{
      const q=new URLSearchParams({variant_id:String(variantId),limit:'50'});
      const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
      const candidates=resolver.inventoryCandidates(data);
      const exact=candidates.find(x=>Number(x&&x.variant_id)===variantId)||resolver.findCandidate(candidates,{variantId,sku:expected.sku});
      if(exact&&Number(exact.id))return Number(exact.id);
    }catch{}
    for(let page=1;page<=MAX_LIST_PAGES;page+=1){
      const q=new URLSearchParams({limit:String(LIST_PAGE_LIMIT),page:String(page)});
      const data=await sapoFetch(sapo,`/admin/inventory_items.json?${q.toString()}`);
      const candidates=resolver.inventoryCandidates(data);
      const exact=candidates.find(x=>Number(x&&x.variant_id)===variantId)||null;
      if(exact&&Number(exact.id))return Number(exact.id);
      if(candidates.length<LIST_PAGE_LIMIT)break;
    }
    throw new Error(`Không tìm thấy inventory item cho SKU ${expected.sku} / variant ${variantId}.`);
  }

  function variantFrom(data){
    if(data&&data.variant&&typeof data.variant==='object')return data.variant;
    if(data&&data.data&&data.data.variant&&typeof data.data.variant==='object')return data.data.variant;
    if(data&&data.data&&typeof data.data==='object'&&!Array.isArray(data.data))return data.data;
    return null;
  }

  async function setVariantStock(sapo,sapoVariant,expected){
    const variantId=Number(sapoVariant&&sapoVariant.id);
    if(!variantId)throw new Error(`Không có variant ID cho SKU ${expected.sku}.`);

    // Ưu tiên API tồn theo đúng location đã chọn.
    // Nếu Private App của shop từ chối inventory_levels bằng 403 access_denied,
    // fallback sang Product Variant API chính thức (cùng quyền write_products đã tạo được SP).
    try{
      const invId=await inventoryItemId(sapo,sapoVariant,expected);
      await sapoFetch(sapo,'/admin/inventory_levels/set.json',{
        method:'POST',
        body:{
          location_id:Number(sapo.locationId),
          inventory_item_id:Number(invId),
          available:Number(expected.stock)
        }
      });
      return{
        method:'inventory_levels.set',
        variantId,
        inventoryItemId:Number(invId),
        available:Number(expected.stock)
      };
    }catch(error){
      const message=error&&error.message||String(error);
      if(!/Sapo HTTP 403:\s*access_denied/i.test(message))throw error;
    }

    const data=await sapoFetch(sapo,`/admin/variants/${variantId}.json`,{
      method:'PUT',
      body:{
        variant:{
          id:variantId,
          inventory_management:'bizweb',
          inventory_quantity:Number(expected.stock)
        }
      }
    });
    const updated=variantFrom(data);
    const actual=Number(updated&&updated.inventory_quantity);
    if(Number.isFinite(actual)&&actual!==Number(expected.stock)){
      throw new Error(`SKU ${expected.sku}: Sapo trả tồn ${actual}, cần ${Number(expected.stock)}.`);
    }
    return{
      method:'variant.inventory_quantity:fallback-403',
      variantId,
      available:Number(expected.stock)
    };
  }

  function retryableStockError(message){
    return /Sapo HTTP (?:500|502|503|504)\b|Failed to fetch|NetworkError|network error|timeout|timed out/i.test(String(message||''));
  }

  async function setVariantStockWithRetry(sapo,sapoVariant,expected,item,queue){
    const delays=[700,1400,2800,5000];
    let lastError=null;

    for(let attempt=1;attempt<=delays.length+1;attempt+=1){
      try{
        const result=await setVariantStock(sapo,sapoVariant,expected);
        if(item){
          item.stockRetry=null;
          item.stockRetryHistory=Array.isArray(item.stockRetryHistory)?item.stockRetryHistory:[];
          if(attempt>1)item.stockRetryHistory.push({
            at:Date.now(),
            sku:text(expected&&expected.sku),
            size:text(expected&&expected.size),
            attempt,
            recovered:true
          });
        }
        return result;
      }catch(error){
        lastError=error;
        const message=error&&error.message||String(error);
        if(!retryableStockError(message)||attempt>delays.length)break;

        if(item){
          item.stockRetry={
            at:Date.now(),
            sku:text(expected&&expected.sku),
            size:text(expected&&expected.size),
            stock:Number(expected&&expected.stock),
            attempt,
            maxAttempts:delays.length+1,
            error:message
          };
          item.stockRetryHistory=Array.isArray(item.stockRetryHistory)?item.stockRetryHistory:[];
          item.stockRetryHistory.push({...item.stockRetry,recovered:false});
        }
        if(queue)await chrome.storage.local.set({[QUEUE_KEY]:queue});
        await sleep(delays[attempt-1]);
      }
    }

    const base=lastError&&lastError.message||String(lastError||'Không rõ lỗi');
    throw new Error(`${base} • đã tự thử lại ${delays.length+1} lần tại đúng SKU ${text(expected&&expected.sku)}`);
  }

  async function syncStock(sapo,item,product,queue){
    let current=product;
    if(!sameExpectedSkus(current,item))current=await loadProduct(sapo,item.productId);
    const bySku=new Map(variantsOf(current).map(v=>[normSku(v&&v.sku),v]));
    if(bySku.size!==item.variants.length)throw new Error(`${item.name}: Sapo tạo thiếu biến thể (${bySku.size}/${item.variants.length}).`);
    item.stockResults=Array.isArray(item.stockResults)?item.stockResults:[];

    while(item.variantIndex<item.variants.length){
      const expected=item.variants[item.variantIndex];
      const sapoVariant=bySku.get(normSku(expected.sku));
      if(!sapoVariant)throw new Error(`${item.name}: không thấy SKU ${expected.sku} sau khi tạo.`);

      const result=await setVariantStockWithRetry(sapo,sapoVariant,expected,item,queue);
      item.stockResults[item.variantIndex]={
        index:item.variantIndex,
        size:text(expected.size),
        sku:text(expected.sku),
        stock:Number(expected.stock),
        variantId:Number(result.variantId),
        method:result.method,
        at:Date.now()
      };
      item.variantIndex+=1;
      // Checkpoint sau từng size: retry sẽ tiếp tục đúng biến thể đang dừng, không ghi lại từ đầu.
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      await sleep(350);
    }
  }

  async function finalize(queue){
    queue.status='done';queue.finishedAt=Date.now();queue.index=queue.items.length;
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
  }

  async function processQueue(){
    const s=await chrome.storage.local.get([QUEUE_KEY,CONFIG_KEY]);
    const queue=s[QUEUE_KEY];
    const config=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const sapo=config.sapo||{};
    if(!queue||queue.status!=='running')return;
    if(!sapo.verifiedAt||!sapo.locationId)throw new Error('Mất xác minh Ứng dụng riêng Sapo.');

    // Khi chạy chế độ sửa lỗi, bỏ qua sản phẩm đã hoàn tất để không ghi/tính lại.
    while(queue.index<queue.items.length&&queue.items[queue.index]&&queue.items[queue.index].status==='done'){
      queue.index+=1;
    }
    if(queue.index>=queue.items.length){await finalize(queue);return;}
    const item=queue.items[queue.index];
    try{
      let product=await createOrAdopt(sapo,item,queue);
      await ensureProductImages(sapo,item,product,queue);
      product=await loadProduct(sapo,item.productId);
      await syncStock(sapo,item,product,queue);
      item.status='done';item.error='';item.finishedAt=Date.now();
      queue.success=Number(queue.success||0)+1;
      queue.index+=1;
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
      if(queue.index>=queue.items.length)await finalize(queue);
      else chrome.alarms.create(ALARM,{when:Date.now()+900});
    }catch(error){
      item.status='error';item.error=error&&error.message||String(error);
      queue.status='paused';
      queue.errors=Array.isArray(queue.errors)?queue.errors:[];
      queue.errors.push({at:Date.now(),index:queue.index,name:item.name,alias:item.alias,productId:Number(item.productId)||0,error:item.error});
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
    }
  }

  async function clearCreateState(){
    try{await chrome.alarms.clear(ALARM);}catch{}
    await chrome.storage.local.remove(QUEUE_KEY);
  }

  async function cleanupLegacyQueue(){
    const state=await chrome.storage.local.get(QUEUE_KEY);
    const queue=state[QUEUE_KEY];
    if(!queue)return false;
    const ts=Number(queue.createdAt||queue.startedAt||0);
    if(ts>0&&ts<LEGACY_QUEUE_CUTOFF){
      await clearCreateState();
      return true;
    }
    return false;
  }

  async function start(products){
    const config=await readConfig(),sapo=config.sapo||{};
    if(!sapo.verifiedAt||!sapo.locationId)throw new Error('Chưa xác minh Ứng dụng riêng Sapo. Bấm KIỂM TRA KẾT NỐI SAPO trước.');
    await cleanupLegacyQueue();
    const state=await chrome.storage.local.get(QUEUE_KEY),old=state[QUEUE_KEY];
    if(old&&old.status==='running')throw new Error('Đang có một lượt đăng Sapo đang chạy. Chờ lượt hiện tại xong rồi thử lại.');
    if(old)await clearCreateState();
    const items=(Array.isArray(products)?products:[]).slice(0,250).map(sanitizeProduct);
    if(!items.length)throw new Error('Không có sản phẩm hợp lệ để đăng lên Sapo.');

    const aliasSeen=new Set(),skuSeen=new Set();
    for(const item of items){
      const aliasKey=item.alias.toLowerCase();
      if(aliasSeen.has(aliasKey))throw new Error(`Trùng alias trong lượt đẩy: ${item.alias}.`);
      aliasSeen.add(aliasKey);
      for(const variant of item.variants){
        const skuKey=normSku(variant.sku);
        if(skuSeen.has(skuKey))throw new Error(`Trùng SKU trong lượt đẩy: ${variant.sku}.`);
        skuSeen.add(skuKey);
      }
    }

    const queue={
      id:`product-create-${Date.now()}`,status:'running',createdAt:Date.now(),startedAt:Date.now(),finishedAt:0,
      shop:storeHost(sapo.storeHost),locationId:Number(sapo.locationId),locationName:text(sapo.locationName),
      index:0,total:items.length,success:0,created:0,adopted:0,errors:[],items
    };
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    chrome.alarms.create(ALARM,{when:Date.now()+500});
    return queue;
  }

  async function retry(){
    const state=await chrome.storage.local.get(QUEUE_KEY),queue=state[QUEUE_KEY];
    if(!queue||!['paused','done'].includes(queue.status))throw new Error('Không có hàng đợi tạo sản phẩm cần xử lý lại.');

    const items=Array.isArray(queue.items)?queue.items:[];
    const unfinished=[];
    for(let i=0;i<items.length;i+=1){
      const item=items[i];
      if(!item||item.status==='done')continue;
      unfinished.push(i);
      item.skipped=false;
      item.skippedAt=0;
      item.error='';
      // Giữ nguyên productId/imageIndex/variantIndex để tiếp tục đúng checkpoint,
      // không tạo lại sản phẩm và không ghi lại các size đã thành công.
      item.status=Number(item.productId)?'stock':'pending';
    }
    if(!unfinished.length)throw new Error('Không còn sản phẩm nào cần xử lý lại.');

    queue.retryHistory=Array.isArray(queue.retryHistory)?queue.retryHistory:[];
    queue.retryHistory.push({
      at:Date.now(),
      unfinished:unfinished.length,
      firstIndex:unfinished[0],
      reason:'retry unfinished product/image/stock checkpoints'
    });
    queue.index=unfinished[0];
    queue.success=items.filter(item=>item&&item.status==='done').length;
    queue.failed=0;
    queue.errors=[];
    queue.finishedAt=0;
    queue.systemPaused=false;
    queue.systemError='';
    queue.status='running';
    await chrome.storage.local.set({[QUEUE_KEY]:queue});
    chrome.alarms.create(ALARM,{when:Date.now()+500});
    return queue;
  }

  chrome.alarms.onAlarm.addListener(alarm=>{
    if(alarm.name!==ALARM)return;
    processQueue().catch(async error=>{
      const state=await chrome.storage.local.get(QUEUE_KEY),queue=state[QUEUE_KEY];
      if(!queue)return;
      queue.status='paused';
      queue.errors=Array.isArray(queue.errors)?queue.errors:[];
      queue.errors.push({at:Date.now(),index:queue.index,error:error&&error.message||String(error)});
      await chrome.storage.local.set({[QUEUE_KEY]:queue});
    });
  });

  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(!message||!message.type)return;
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_GET_STATE'){
      cleanupLegacyQueue().then(()=>Promise.all([readConfig(),chrome.storage.local.get(QUEUE_KEY)])).then(([config,s])=>{
        const sapo=config.sapo||{};
        sendResponse({ok:true,verified:Boolean(sapo.verifiedAt&&sapo.locationId),shop:text(sapo.storeHost),locationName:text(sapo.locationName),queue:s[QUEUE_KEY]||null});
      }).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_START'){
      start(message.products||[]).then(queue=>sendResponse({ok:true,queue})).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_RETRY'){
      retry().then(queue=>sendResponse({ok:true,queue})).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
    if(message.type==='DHL_SAPO_PRODUCT_CREATE_CLEAR_STATE'){
      clearCreateState().then(()=>sendResponse({ok:true})).catch(error=>sendResponse({ok:false,error:error&&error.message||String(error)}));
      return true;
    }
  });
})();
