import {SHOPS,calculatePrice,imagePrompts,validateDraft,safeFilename,makeSaleVariants,parseSkuLines,serializeSkuLines,saleSummary,readSourceDocument} from './lib/core.mjs';
import {makeWorkbook} from './lib/xlsx-lite.mjs';
const $=id=>document.getElementById(id);
let draft=null,selectedLanguage='vi',images=[],prompts=[],pageUrl='',driveFolder='',sourceFolder=null,sourceFolderView=null;
let finishedPhotos=[],generatedPlatforms=new Map(),draftIdentity=null,sourceDocTexts=[],variantRows=[];
const keys=['cost','feePercent','packing','printing','labor','other','fixedFee','targetProfit'];
const fields={title:'Tên sản phẩm',short:'Mô tả ngắn',description:'Mô tả chi tiết',seoTitle:'Tiêu đề SEO',seoDescription:'Mô tả SEO',slug:'Đường dẫn URL',keywords:'Từ khóa',altText:'Mô tả ảnh (alt)'};
const text=id=>$(id)?.value?.trim()||'';
function notify(msg,ok=true){$('toast').textContent=msg;$('toast').style.color=ok?'#176b49':'#a23333';}
function page(tab){for(const b of document.querySelectorAll('nav button'))b.classList.toggle('selected',b.dataset.tab===tab);for(const v of document.querySelectorAll('main section[data-view]'))v.hidden=v.dataset.view!==tab;}
for(const b of document.querySelectorAll('nav button'))b.onclick=()=>{
  if(b.dataset.tab==='driveSave'){
    $('driveShopLabel').textContent=text('shop')||'Shop';
    $('driveProductLabel').textContent=draft?.vi?.title||text('name')||'Tên sản phẩm';
  }
  page(b.dataset.tab);
};
function selectedSaleTypes(){return [...document.querySelectorAll('input[name="saleType"]:checked')].map(x=>x.value);}
function selectedDimensions(){return [['dimColor','color'],['dimSize','size'],['dimType','type']].filter(([id])=>$(id).checked).map(([,name])=>name);}
function saleInfo(){return {saleTypes:selectedSaleTypes(),dimensions:selectedDimensions(),colors:text('colorOptions'),sizes:text('sizeOptions'),variants:text('variants')};}
function shippingInfo(){return Object.fromEntries(['weightGrams','lengthCm','widthCm','heightCm'].map(id=>[id,text(id)]));}
function product(){const sales=saleInfo();return {shop:text('shop'),name:text('name'),sku:text('sku'),category:text('category'),variants:saleSummary(sales),notes:text('notes'),sourceDocuments:sourceDocTexts.map(({name,text})=>({name,text})),sales,shipping:shippingInfo(),pageUrl,images};}
function completeUserFields(){return Object.fromEntries([...keys,'weightGrams','lengthCm','widthCm','heightCm','variantName1','variantName2','skuLines'].map(id=>[id,$(id).value]));}
function restoreUserFields(v={}){for(const [id,val] of Object.entries(v)){const el=$(id);if(el&&val!==undefined)el.value=val;}}
function restoreSaleInfo(v={}){for(const el of document.querySelectorAll('input[name="saleType"]'))el.checked=(v.saleTypes||[]).includes(el.value);for(const [id,d] of [['dimColor','color'],['dimSize','size'],['dimType','type']])$(id).checked=(v.dimensions||[]).includes(d);$('colorOptions').value=v.colors||'';$('sizeOptions').value=v.sizes||'';}
function syncVariantText(){try{$('skuLines').value=serializeSkuLines(variantRows);$('variantStatus').textContent=variantRows.length+' dòng SKU đang được kiểm tra.';}catch(e){notify(e.message,false)}}
function renderVariants(){const host=$('variantRows');host.replaceChildren();for(let i=0;i<variantRows.length;i++){
 const row=variantRows[i],tr=document.createElement('tr');
 for(const [key,kind] of [['sku','text'],['opt1','text'],['opt2','text'],['price','number'],['stock','number']]){
  const td=document.createElement('td'),input=document.createElement('input');input.type=kind;if(kind==='number')input.min='0';input.value=row[key]||'';
  input.setAttribute('aria-label',key+' dòng '+(i+1));input.oninput=()=>{row[key]=input.value;syncVariantText()};td.append(input);tr.append(td);
 }
 const td=document.createElement('td'),del=document.createElement('button');del.type='button';del.textContent='Xóa';del.onclick=()=>{variantRows.splice(i,1);renderVariants();syncVariantText()};td.append(del);tr.append(td);host.append(tr);
}}
$('buildVariants').onclick=()=>{try{if(variantRows.length&&!confirm('Tạo lại bảng sẽ thay các dòng SKU hiện có. Tiếp tục?'))return;
 const v=makeSaleVariants({sku:text('sku'),dimensions:selectedDimensions(),colors:text('colorOptions'),sizes:text('sizeOptions'),saleTypes:selectedSaleTypes()});
 variantRows=v.rows;$('variantName1').value=v.variantName1;$('variantName2').value=v.variantName2;
 renderVariants();syncVariantText();notify('Đã tạo '+variantRows.length+' SKU. Giá và tồn kho để trống, cần tự xác nhận.');
 }catch(e){$('variantStatus').textContent=e.message;notify(e.message,false)}};
$('addVariant').onclick=()=>{variantRows.push({sku:text('sku'),opt1:'',opt2:'',price:'',stock:''});renderVariants();syncVariantText()};
$('skuLines').onchange=()=>{try{variantRows=parseSkuLines(text('skuLines'));renderVariants();$('variantStatus').textContent='Đã nhận '+variantRows.length+' dòng SKU được chỉnh tay.';}catch(e){notify(e.message,false)}};
$('goToContent').onclick=()=>{if(!draft)return notify('Hãy phân tích sản phẩm trước.',false);page('content')};
$('backToInput').onclick=()=>page('input');
$('sourceDocs').onchange=async e=>{sourceDocTexts=[];const files=[...e.target.files];if(files.length>5)return notify('Chỉ nhận tối đa 5 tài liệu mỗi lần.',false);
 const failed=[];for(const f of files){try{const d=await readSourceDocument(f);sourceDocTexts.push(d);if(d.truncated)failed.push(f.name+': chỉ lấy 16.000 ký tự đầu');}catch(err){failed.push(f.name+': '+err.message)}}
 $('sourceDocsStatus').textContent=sourceDocTexts.length?('Đã đọc '+sourceDocTexts.length+' tài liệu: '+sourceDocTexts.map(x=>x.name).join(', ')):('Chưa có tài liệu đọc được.');
 if(failed.length)notify(failed.join(' | '),false);else notify('Đã đưa '+sourceDocTexts.length+' tài liệu vào nguồn phân tích.');
};
function priceInput(){return Object.fromEntries(keys.map(k=>[k,$(k).value]));}
function saveBlob(filename,data,mime){const blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
async function message(m){const r=await chrome.runtime.sendMessage(m);if(!r?.ok)throw Error(r?.error||'Không nhận được phản hồi của extension.');return r.result;}
async function copy(value){try{await navigator.clipboard.writeText(value);notify('Đã sao chép nội dung.');}catch{notify('Không thể sao chép tự động. Chọn nội dung và sao chép thủ công.',false);}}
// Source screenshots: paste, drag/drop, select repeatedly, remove/reorder visually.
// No product name, SKU, cost, weight or variants needed until finalization.
const MAX_SCREENSHOTS=6, MAX_IMAGE_BYTES=3_000_000;
async function screenshotData(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Chỉ nhận ảnh PNG, JPG hoặc WEBP.');
  if(file.size<=MAX_IMAGE_BYTES){
    return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Không đọc được ảnh.'));reader.readAsDataURL(file);});
  }
  // Large clipboard screenshots are scaled/compressed locally, never uploaded to another site.
  const bitmap=await createImageBitmap(file);
  try{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('Không khởi tạo được bộ xử lý ảnh.');
    let scale=Math.min(1,3600/Math.max(bitmap.width,bitmap.height));
    for(let attempt=0;attempt<5;attempt++){
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [0.9,0.82,0.72,0.6]){
        const data=canvas.toDataURL('image/jpeg',quality);
        if((data.length-data.indexOf(',')-1)*0.75<=MAX_IMAGE_BYTES)return data;
      }
      scale*=0.82;
    }
    throw Error('Ảnh quá lớn để xử lý. Hãy chụp lại một vùng nhỏ hơn.');
  }finally{bitmap.close?.();}
}
function refreshScreenshots(){
  const host=$('previews');host.replaceChildren();
  images.forEach((data,index)=>{
    const tile=document.createElement('div');tile.className='screenshot-tile';
    const img=document.createElement('img');img.src=data;img.alt='Ảnh nguồn '+(index+1);
    const remove=document.createElement('button');remove.type='button';remove.className='screenshot-remove';remove.textContent='Xóa ảnh '+(index+1);
    remove.setAttribute('aria-label','Xóa ảnh '+(index+1));
    remove.onclick=()=>{images.splice(index,1);refreshScreenshots();};tile.append(img,remove);host.append(tile);
  });
  const left=MAX_SCREENSHOTS-images.length;
  $('screenshotStatus').textContent=images.length
    ?`Đã nhận ${images.length}/${MAX_SCREENSHOTS} ảnh nguồn. Có thể dán thêm ${left} ảnh hoặc bấm Phân tích.`
    :'Chưa có ảnh. Dán ngay từ clipboard hoặc chọn ảnh trên máy.';
}
async function receiveScreenshots(files){
  const candidates=[...files];let added=0;const errors=[];
  for(const f of candidates){
    if(images.length>=MAX_SCREENSHOTS){errors.push('Đủ 6 ảnh; hãy xóa ảnh cũ trước khi thêm.');break;}
    try{images.push(await screenshotData(f));added++;}
    catch(e){errors.push((f.name||'Ảnh clipboard')+': '+e.message);}
  }
  refreshScreenshots();
  if(errors.length)notify(errors.join(' | '),false);
  else if(added)notify(`Đã thêm ${added} ảnh. Bạn có thể phân tích ngay.`);
}
$('photos').onchange=async e=>{await receiveScreenshots(e.target.files);e.target.value='';};
const drop=$('screenshotDrop');
drop.onclick=e=>{if(e.target!==$('photos'))$('photos').click();};
drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('photos').click();}};
drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};
drop.ondragleave=e=>{if(!drop.contains(e.relatedTarget))drop.classList.remove('dragging');};
drop.ondrop=async e=>{e.preventDefault();drop.classList.remove('dragging');await receiveScreenshots([...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')));};
document.addEventListener('paste',async e=>{
  const files=[...(e.clipboardData?.items||[])].filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
  if(!files.length)return; // Text pasted into the optional notes field is not intercepted.
  e.preventDefault();await receiveScreenshots(files);
});
$('readTab').onclick=async()=>{try{
  const copied=await navigator.clipboard.readText();if(!copied.trim())throw Error('Clipboard đang trống.');
  const combined=[text('notes'),copied.trim()].filter(Boolean).join('\n');
  if(combined.length>5000)throw Error('Văn bản nguồn vượt 5.000 ký tự. Hãy dán và tóm tắt phần cần thiết trong ô nguồn.');
  $('notes').value=combined;notify('Đã đưa văn bản từ clipboard vào thông tin nguồn. Kiểm tra trước khi phân tích.');
}catch(e){notify('Chưa đọc được clipboard. Hãy dùng Ctrl+V dán trực tiếp vào ô thông tin nguồn. '+(e.message||''),false)}};
function updateContent(){if(!draft)return;const lang=draft[selectedLanguage],node=$('contentFields');node.replaceChildren();node.className='fieldgroup';
  for(const [key,label] of Object.entries(fields)){
    const wrap=document.createElement('label');wrap.textContent=label;const control=['description','short','seoDescription'].includes(key)?document.createElement('textarea'):document.createElement('input');
    if(control.tagName==='TEXTAREA')control.rows=key==='description'?7:3;control.value=lang[key];control.oninput=()=>{draft[selectedLanguage][key]=control.value;prompts=[];};wrap.append(control);node.append(wrap);
  }
  $('missing').hidden=!draft.missing?.length;$('missing').textContent='Chờ xác minh: '+draft.missing.join(' · ');
}
for(const b of document.querySelectorAll('.lang'))b.onclick=()=>{selectedLanguage=b.dataset.lang;document.querySelectorAll('.lang').forEach(e=>e.classList.toggle('chosen',e===b));updateContent()};
$('analyze').onclick=async()=>{const b=$('analyze');b.disabled=true;notify('Đang phân tích nguồn sản phẩm bằng Gemini...');$('analysisStatus').textContent='Đang phân tích ảnh, tài liệu và ghi chú nguồn...';try{
  if(!images.length&&!text('notes')&&!sourceDocTexts.length&&!pageUrl)throw Error('Chưa có dữ liệu nguồn. Hãy thêm ảnh, tài liệu hoặc dán mô tả trước khi phân tích.');
  const r=await message({type:'analyze',product:product()});draft=validateDraft(r.draft);
  if(!text('name'))$('name').value=draft.vi.title;
  if(!text('category')&&draft.facts.category)$('category').value=draft.facts.category;
  draftIdentity={shop:text('shop'),sku:text('sku'),name:text('name')};generatedPlatforms.clear();prompts=[];updateContent();
  $('analysisStatus').textContent='Đã phân tích: '+draft.vi.title+'\nĐặc điểm: '+[draft.facts.category,draft.facts.material,draft.facts.dimensions].filter(Boolean).join(' · ')+(draft.missing.length?'\nCần xác minh: '+draft.missing.join('; '):'\nKhông phát hiện trường bắt buộc chưa rõ trong phản hồi AI.')+'\nBạn có thể xem nội dung và prompt ngay. Khi cần bán hàng, hãy mở mục Bổ sung thông tin bán hàng.';
  notify('Đã phân tích xong. Bạn có thể xem Nội dung, Prompt ảnh; chưa cần điền giá hoặc SKU.');
}catch(e){$('analysisStatus').textContent='Chưa hoàn thành phân tích: '+e.message;notify(e.message,false)}finally{b.disabled=false;}};
$('saveDraft').onclick=async()=>{if(!draft)return notify('Chưa có bản nháp.',false);await chrome.storage.local.set({productDraft:{draft,product:{...product(),images:[],sourceDocuments:[]},fields:completeUserFields(),sales:saleInfo(),savedAt:Date.now()}});notify('Đã lưu bản nháp ở Chrome (không lưu ảnh gốc).');};
$('restoreDraft').onclick=async()=>{const {productDraft}=await chrome.storage.local.get('productDraft');if(!productDraft)return notify('Chưa có bản nháp.',false);draft=validateDraft(productDraft.draft);generatedPlatforms.clear();draftIdentity={shop:productDraft.product?.shop,sku:productDraft.product?.sku,name:productDraft.product?.name};for(const k of ['shop','name','sku','category','notes'])$(k).value=productDraft.product?.[k]||'';$('variants').value=productDraft.sales?.variants||'';restoreUserFields(productDraft.fields);restoreSaleInfo(productDraft.sales);variantRows=parseSkuLines(text('skuLines'));renderVariants();$('analysisStatus').textContent='Đã khôi phục bản nháp. Ảnh/tài liệu nguồn cần chọn lại nếu muốn phân tích lại.';updateContent();page('input');notify('Đã khôi phục bản nháp (cần đính kèm ảnh lại).');};
$('deleteDraft').onclick=async()=>{await chrome.storage.local.remove('productDraft');notify('Đã xóa bản nháp đã lưu.');};
$('makePrompts').onclick=()=>{try{if(!draft)throw Error('Chưa phân tích sản phẩm.');prompts=imagePrompts(draft,product());const host=$('prompts');host.replaceChildren();for(const item of prompts){const card=document.createElement('div'),title=document.createElement('strong'),ta=document.createElement('textarea'),btn=document.createElement('button');card.className='prompt-card';title.textContent=`Ảnh ${item.index}: ${item.title}`;ta.value=item.prompt;ta.rows=6;ta.onchange=()=>{item.prompt=ta.value};btn.textContent='Sao chép prompt ảnh '+item.index;btn.onclick=()=>copy(ta.value);card.append(title,ta,btn);host.append(card);}notify('Đã tạo 9 prompt, không gọi API tạo ảnh.');}catch(e){notify(e.message,false)}};
const allPrompts=()=>prompts.map(p=>`===== ẢNH ${p.index}: ${p.title} =====\n${p.prompt}`).join('\n\n');
$('copyAll').onclick=()=>prompts.length?copy(allPrompts()):notify('Hãy tạo prompt trước.',false);
$('saveTxt').onclick=()=>prompts.length?saveBlob('PROMPT_ANH_'+safeFilename(text('sku'))+'.txt',allPrompts(),'text/plain;charset=utf-8'):notify('Hãy tạo prompt trước.',false);
$('openChatGPT').onclick=()=>chrome.tabs.create({url:'https://chatgpt.com/'});
$('openAIStudio').onclick=()=>chrome.tabs.create({url:'https://aistudio.google.com/apikey'});
$('storeKey').onclick=async()=>{const geminiKey=text('geminiKey'),geminiModel=text('geminiModel');if(!geminiKey||geminiKey.length<12)return notify('Nhập API key hợp lệ.',false);await chrome.storage.local.set({geminiKey,geminiModel});$('geminiKey').value='';$('status').textContent='Gemini đã cấu hình';notify('Đã lưu Gemini key trong bộ nhớ extension trên máy.');};
$('clearKey').onclick=async()=>{await chrome.storage.local.remove('geminiKey');$('status').textContent='Chưa cấu hình';notify('Đã xóa Gemini key được lưu.');};
(async()=>{const cfg=await chrome.storage.local.get(['geminiKey','geminiModel']);$('status').textContent=cfg.geminiKey?'Gemini đã cấu hình':'Chưa có API key';if(cfg.geminiModel)$('geminiModel').value=cfg.geminiModel;})().catch(e=>notify(e.message,false));
$('compute').onclick=()=>{try{const price=calculatePrice(priceInput());const v=n=>Math.round(n).toLocaleString('vi-VN')+'đ';$('priceResult').textContent=`Giá Shopee: ${v(price.shopeePrice)} | Thực nhận: ${v(price.net)} | Lợi nhuận: ${v(price.profit)} | Giá Web/offline: ${v(price.webPrice)}`;notify('Giá gợi ý: cần xác nhận phí và giá vốn thực tế.');}catch(e){notify(e.message,false)}};
function exportInfo(){if(!draft)throw Error('Chưa có nội dung sản phẩm.');const p=product(),extra=[['SKU',p.sku],['Shop',p.shop],['Danh mục',draft.facts.category||p.category],['Chất liệu',draft.facts.material||'CHỜ CHỐT'],['Kích thước',draft.facts.dimensions||'CHỜ CHỐT'],['Biến thể',p.variants||draft.facts.variants],['Loại bán đã chọn',p.sales.saleTypes.join(', ')||'CHƯA CHỌN'],['Cân nặng đóng gói (g)',p.shipping.weightGrams||'CHỜ CÂN'],['Kích thước kiện (cm)',[p.shipping.lengthCm,p.shipping.widthCm,p.shipping.heightCm].join(' × ')],['Giá vốn (VND)',text('cost')||'CHỜ CHỐT'],['Thiếu thông tin',draft.missing.join(' | ')],['Trạng thái','CHỜ DUYỆT']];const lang=k=>[['Trường','Giá trị'],...extra,['Tên sản phẩm',draft[k].title],['Mô tả ngắn',draft[k].short],['Mô tả chi tiết',draft[k].description]];return makeWorkbook([{name:'Tiếng Việt',rows:lang('vi')},{name:'English',rows:lang('en')}]);}
function exportSEO(){if(!draft)throw Error('Chưa có nội dung sản phẩm.');const p=product();const lang=k=>[['Trường SEO','Giá trị'],['Shop',p.shop],['SKU',p.sku],['Tên sản phẩm',draft[k].title],['Meta title',draft[k].seoTitle],['Meta description',draft[k].seoDescription],['Slug URL',draft[k].slug],['Keywords',draft[k].keywords],['Mô tả ngắn',draft[k].short],['Mô tả chi tiết',draft[k].description],['Alt ảnh',draft[k].altText],['Giá USD','CHỜ CHỐT'],['Trạng thái','CHỜ DUYỆT']];return makeWorkbook([{name:'Tiếng Việt',rows:lang('vi')},{name:'English',rows:lang('en')}]);}
function exportPrice(){const p=calculatePrice(priceInput()),v=priceInput();return makeWorkbook([{name:'Giá đề xuất',rows:[['Hạng mục','VND / %'],['Shop',text('shop')],['SKU',text('sku')],['Giá vốn',Number(v.cost)],['Đóng gói',Number(v.packing)],['In ấn',Number(v.printing)],['Nhân công',Number(v.labor)],['Chi phí khác',Number(v.other)],['Phí sàn (%)',Number(v.feePercent)],['Phí cố định',Number(v.fixedFee)],['Tổng chi phí',p.totalCost],['Giá Shopee đề xuất',p.shopeePrice],['Phí dự tính',p.fee],['Thực nhận',p.net],['Lợi nhuận',p.profit],['Giá web/bán ngoài gợi ý',p.webPrice],['Trạng thái','CHỜ DUYỆT - CHƯA GHI BẢNG GIÁ GỐC']]},{name:'Bảng SKU',rows:[['SKU','Loại 1','Loại 2','Giá bán','Tồn kho'],...parseSkuLines(text('skuLines')).map(r=>[r.sku,r.opt1,r.opt2,r.price||'CHỜ CHỐT',r.stock||'CHỜ CHỐT'])]}]);}
for(const [id,fn,prefix] of [['excelInfo',exportInfo,'THONG_TIN_VI_EN'],['excelSEO',exportSEO,'SEO_WEB_VI_EN'],['excelPrice',exportPrice,'BANG_GIA_DE_XUAT']])$(id).onclick=()=>{try{const data=fn();saveBlob(prefix+'_'+safeFilename(text('sku'))+'.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');notify('Đã tải Excel. File là bản nháp, chưa tự nhập sàn.');}catch(e){notify(e.message,false)}};
const backend=(path,data,method='POST',extra={})=>message({type:'backend',path,method,password:text('backendPassword'),data,...extra});
let driveItems=[];
$('shop').onchange=()=>{driveFolder='';sourceFolder=null;sourceFolderView=null;driveItems=[];$('driveFiles').replaceChildren();$('sourceFolderStatus').textContent='Đã đổi shop, hãy chọn lại thư mục nguồn.';};
$('listDrive').onclick=async()=>{
  const b=$('listDrive');b.disabled=true;
  try{
    const result=await message({type:'drive-source-list',shop:text('shop'),folderId:driveFolder});
    driveItems=result.entries||[];sourceFolderView=result.folder;
    const host=$('driveFiles');host.replaceChildren();
    $('sourceFolderStatus').textContent='Đang xem: '+text('shop')+' / '+result.folder.name;
    if(result.folder.parentId){
      const back=document.createElement('button');back.textContent='← Thư mục cha';
      back.onclick=()=>{driveFolder=result.folder.parentId===result.shopRootId?'':result.folder.parentId;$('listDrive').click();};
      host.append(back);
    }
    for(const f of driveItems){
      if(f.mimeType==='application/vnd.google-apps.folder'){
        const button=document.createElement('button');button.textContent='📁 '+f.name;
        button.onclick=()=>{driveFolder=f.id;$('listDrive').click();};host.append(button);
      }else{
        const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=f.id;checkbox.name='driveFile';checkbox.disabled=!f.supported||f.size>3_000_000;
        const size=f.size?' · '+Math.ceil(f.size/1024)+' KB':'';
        label.append(checkbox,document.createTextNode(' '+f.name+size+(checkbox.disabled?' (chưa hỗ trợ phân tích trực tiếp)':'')));
        host.append(label);
      }
    }
    if(!driveItems.length)host.append(document.createTextNode('Thư mục này chưa có file hoặc thư mục con.'));
    notify('Đã đọc '+driveItems.length+' mục trực tiếp từ Google Drive.');
  }catch(e){notify(e.message,false);$('sourceFolderStatus').textContent='Không thể duyệt Drive: '+e.message;}
  finally{b.disabled=false;}
};
$('useSourceFolder').onclick=async()=>{
  try{
    const result=await message({type:'drive-source-list',shop:text('shop'),folderId:driveFolder});
    sourceFolder={id:result.folder.id,shop:text('shop'),name:result.folder.name};
    $('sourceFolderStatus').textContent='Đã chọn thư mục nguồn: '+sourceFolder.shop+' / '+sourceFolder.name+' (ID '+sourceFolder.id+')';
    notify('Đã xác định thư mục nguồn. Bạn có thể chọn ảnh/tài liệu hoặc phân tích ảnh đã có.');
  }catch(e){notify(e.message,false);}
};
$('attachDrive').onclick=async()=>{
  const ids=[...document.querySelectorAll('input[name="driveFile"]:checked')].map(x=>x.value);
  if(!ids.length)return notify('Chọn ít nhất một ảnh hoặc tài liệu.',false);
  if(ids.length>4)return notify('Chọn tối đa 4 file mỗi lần.',false);
  let done=0;
  for(const fileId of ids){
    try{
      const f=await message({type:'drive-source-read',shop:text('shop'),folderId:driveFolder,fileId});
      if(f.kind==='image'){
        if(images.length>=MAX_SCREENSHOTS)throw Error('Đã đủ 6 ảnh. Bỏ ảnh cũ trước khi thêm ảnh mới.');
        images.push(f.data);refreshScreenshots();
      }else if(f.kind==='office'){
        const binary=atob(f.data),arr=new Uint8Array(binary.length);for(let j=0;j<arr.length;j++)arr[j]=binary.charCodeAt(j);
        const d=await readSourceDocument({name:f.name,size:arr.length,arrayBuffer:async()=>arr.buffer});sourceDocTexts.push(d);$('sourceDocsStatus').textContent='Tài liệu nguồn: '+sourceDocTexts.map(x=>x.name).join(', ');
      }else{
        sourceDocTexts.push({name:f.name,text:f.data,truncated:false});$('sourceDocsStatus').textContent='Tài liệu nguồn: '+sourceDocTexts.map(x=>x.name).join(', ');
      }
      done++;
    }catch(e){notify('Đã lấy '+done+'/'+ids.length+' file; '+e.message,false);return;}
  }
  sourceFolder={id:driveFolder||'',shop:text('shop'),name:$('sourceFolderStatus').textContent};
  notify('Đã nhập '+done+' file vào sản phẩm từ Drive; tài liệu gốc vẫn giữ nguyên.');
};
function listing(){return {reviewed:$('reviewed').checked,categoryConfirmed:$('categoryConfirmed').checked,brandConfirmed:$('brandConfirmed').checked,categoryId:text('categoryId'),brand:text('brand'),coverUrl:text('coverUrl'),imageUrls:text('imageUrls').split('\n').map(x=>x.trim()).filter(Boolean),variantName1:text('variantName1'),variantName2:text('variantName2'),weightGrams:text('weightGrams'),lengthCm:text('lengthCm'),widthCm:text('widthCm'),heightCm:text('heightCm'),variants:parseSkuLines(text('skuLines'))};}
async function exportPlatform(platform){try{if(!draft)throw Error('Chưa có nội dung AI.');if(!confirm('Xuất file mẫu '+platform+' để thử 1 SKU? Chưa được xác nhận nhập sàn thành công.'))return;const r=await backend('/api/export-platform',{platform,draft,product:product(),listing:listing()});const binary=atob(r.base64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);generatedPlatforms.set(platform,bytes);saveBlob(platform.toUpperCase()+'_CHO_DUYET_'+safeFilename(text('sku'))+'.xlsx',bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');notify('Đã xuất '+platform+' trên file mẫu gốc, chờ thử import 1 SKU.');}catch(e){notify(e.message,false)}}
$('bigSeller').onclick=()=>exportPlatform('bigseller');$('lazada').onclick=()=>exportPlatform('lazada');

// Product finalization: single action creates/reuses Shop → Product folder and uploads every confirmed artifact.
// Never modify the global Shopee pricing reference or the shop's official import templates.
const IMAGE_MIMES=new Set(['image/png','image/jpeg','image/webp']);
const mimex=m=>m==='image/png'?'png':m==='image/webp'?'webp':'jpg';
function dataUrlFile(s,name){const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s||'');if(!m)throw Error('Ảnh gốc không hợp lệ.');return {name,mime:m[1],base64:m[2]};}
function bytesBase64(bytes){let result='';for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(result);}
function utf8Base64(s){return bytesBase64(new TextEncoder().encode(s));}
function xlsxFile(name,bytes){return {name,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:bytesBase64(bytes)};}
async function uploadedImage(file,name){if(!IMAGE_MIMES.has(file.type)||file.size>8_000_000)throw Error('Ảnh thành phẩm chỉ JPG/PNG/WEBP, tối đa 8 MB mỗi ảnh.');const arr=new Uint8Array(await file.arrayBuffer());return {name,mime:file.type,base64:bytesBase64(arr)};}
$('finishedPhotos').onchange=e=>{
  finishedPhotos=[...e.target.files].slice(0,12);
  const oversize=finishedPhotos.filter(f=>!IMAGE_MIMES.has(f.type)||f.size>8_000_000);
  if(oversize.length)notify('Một số ảnh thành phẩm không đúng định dạng hoặc vượt 8 MB; cần chọn lại.',false);
  $('finishedPhotoList').textContent=finishedPhotos.map(f=>f.name+' ('+Math.round(f.size/1024)+' KB)').join(' · ');
};
$('copyRedirect').onclick=()=>copy(chrome.runtime.id);
$('openGoogleCloud').onclick=()=>chrome.tabs.create({url:'https://console.cloud.google.com/auth/clients'});
$('connectGoogle').onclick=async()=>{
  const btn=$('connectGoogle');btn.disabled=true;
  try{
    const r=await message({type:'drive-connect',shop:text('shop')});
    $('googleConnection').textContent='Đã kết nối Google Drive'+(r.account?.email?' ('+r.account.email+')':'')+'. Đã xác minh shop '+r.verifiedShop+'.';
    notify('Đã cấp quyền Google Drive.');
  }catch(e){notify(e.message,false);$('googleConnection').textContent='Chưa kết nối: '+e.message;}
  finally{btn.disabled=false;}
};
$('disconnectGoogle').onclick=async()=>{try{await message({type:'drive-disconnect'});$('googleConnection').textContent='Đã ngắt kết nối Google Drive.';notify('Đã ngắt phiên Google trên extension.');}catch(e){notify(e.message,false)}};
$('verifySaveDrive').onclick=async()=>{try{const d=await message({type:'drive-verify',shop:text('shop')});$('saveDriveProgress').textContent='Đã xác minh thư mục shop: '+d.name+' · ID '+d.id;notify('Đã xác minh địa chỉ lưu của shop.');}catch(e){notify(e.message,false);$('saveDriveProgress').textContent=e.message;}};
(async()=>{
  const d=await message({type:'drive-status'});if(d.connected)$('googleConnection').textContent='Đã kết nối Google Drive (Chrome quản lý và tự gia hạn token).';else if(!d.configured)$('googleConnection').textContent='Chưa cấu hình OAuth Client ID trong manifest.json. Cần làm một lần theo README.';
})().catch(e=>notify(e.message,false));
async function productFiles(){
  if(!draft)throw Error('Cần phân tích/duyệt nội dung sản phẩm trước khi lưu.');
  validateDraft(draft);const p=product();if(!p.sku||!p.name)throw Error('Cần nhập tên sản phẩm và SKU.');
  if(!draftIdentity||draftIdentity.shop!==p.shop||(draftIdentity.sku&&draftIdentity.sku!==p.sku)||(draftIdentity.name&&draftIdentity.name!==p.name))throw Error('Thông tin shop, SKU hoặc tên đã thay đổi sau phân tích. Hãy phân tích lại để tránh lưu nhầm sản phẩm.');
  const result=[xlsxFile('Thông tin sản phẩm.xlsx',exportInfo()),xlsxFile('SEO website.xlsx',exportSEO())];
  let pricingStatus='CHƯA CHỐT GIÁ';
  if(text('cost')!==''&&text('feePercent')!==''){result.push(xlsxFile('Bảng giá đề xuất.xlsx',exportPrice()));pricingStatus='ĐÃ TÍNH GIÁ ĐỀ XUẤT';}
  if(!prompts.length)prompts=imagePrompts(draft,p);
  result.push({name:'Prompt tạo ảnh ChatGPT.txt',mime:'text/plain',base64:utf8Base64(allPrompts())});
  for(let i=0;i<images.length;i++){
    const match=/^data:(image\/(?:jpeg|png|webp));/.exec(images[i]);const ext=mimex(match?.[1]);
    result.push(dataUrlFile(images[i],`Ảnh gốc ${i+1}.${ext}`));
  }
  for(let i=0;i<finishedPhotos.length;i++)result.push(await uploadedImage(finishedPhotos[i],`Ảnh thành phẩm ${i+1}.${mimex(finishedPhotos[i].type)}`));
  for(const [platform,bytes] of generatedPlatforms)result.push(xlsxFile(platform==='bigseller'?'BigSeller.xlsx':'Lazada.xlsx',bytes));
  const metadata={shop:p.shop,sku:p.sku,name:p.name,category:p.category,variants:p.variants,sales:p.sales,shipping:p.shipping,skuRows:parseSkuLines(text('skuLines')),priceInputs:priceInput(),notes:p.notes,sourceDocumentNames:sourceDocTexts.map(d=>d.name),sourcePage:p.pageUrl,sourceFolder:sourceFolder?.shop===p.shop?{id:sourceFolder.id,name:sourceFolder.name}:null,pricingStatus,sourceImageCount:images.length,finishedImageCount:finishedPhotos.length,generatedPlatforms:[...generatedPlatforms.keys()],status:pricingStatus==='CHƯA CHỐT GIÁ'||draft.missing.length?'CHỜ BỔ SUNG / KIỂM TRA':'HỒ SƠ ĐÃ DUYỆT - CHƯA XÁC NHẬN IMPORT SÀN',missing:draft.missing,updatedAt:new Date().toISOString()};
  result.push({name:'Thông tin và trạng thái.json',mime:'application/json',base64:utf8Base64(JSON.stringify(metadata,null,2))});
  if(result.length>32)throw Error('Bộ file vượt 32 mục; chia thành nhiều đợt.');
  return {files:result,metadata};
}
$('saveToDrive').onclick=async()=>{
  if(!$('approveForDrive').checked)return notify('Cần tích xác nhận nội dung và thư mục trước khi lưu.',false);
  const btn=$('saveToDrive');btn.disabled=true;
  try{
    const p=product(),{files,metadata}=await productFiles();
    $('saveDriveProgress').textContent='Đang xác minh shop và tạo/tìm thư mục sản phẩm...';
    const folder=await message({type:'drive-folder',product:{shop:p.shop,name:p.name,sku:p.sku}});
    $('savedDriveLink').href=folder.url;$('savedDriveLink').hidden=false;
    const done=[],errors=[];
    for(let i=0;i<files.length;i++){
      $('saveDriveProgress').textContent=`Đang ghi ${i+1}/${files.length} vào ${p.shop} / ${folder.name}: ${files[i].name}`;
      try{done.push(await message({type:'drive-upload',shop:p.shop,sku:p.sku,folderId:folder.id,file:files[i]}));}
      catch(e){errors.push(files[i].name+': '+e.message);}
    }
    if(errors.length){$('saveDriveProgress').textContent=`Đã ghi ${done.length}/${files.length} file; ${errors.length} file lỗi: `+errors.join(' | ');notify('Drive đã lưu một phần, hãy xem báo lỗi và chạy lại sau khi khắc phục.',false);}
    else{$('saveDriveProgress').textContent=`Đã lưu ${done.length} file tại ${p.shop} / ${folder.name}. Trạng thái: ${metadata.status}. Bảng giá Shopee tổng không bị sửa.`;notify('Đã lưu toàn bộ file sản phẩm lên Google Drive.');}
  }catch(e){$('saveDriveProgress').textContent='Không thể lưu: '+e.message;notify(e.message,false)}finally{btn.disabled=false;}
};


// GitHub version checker. Chrome MV3 cannot overwrite its own unpacked files.
$('updateNow').onclick=async()=>{
  const btn=$('updateNow');btn.disabled=true;
  const status=$('gitUpdateStatus');
  status.textContent='Đang kiểm tra phiên bản trên GitHub...';
  try{
    await message({type:'local-updater-ping'});
    const remote=await message({type:'github-update-check'});
    if(remote.upToDate||!remote.updateAvailable){
      status.textContent='Tool đã ở phiên bản mới nhất: v'+remote.latestVersion+'. Không cần cập nhật.';
      notify('Đã ở phiên bản mới nhất.');return;
    }
    status.textContent='Tìm thấy v'+remote.latestVersion+'. Đang dùng bộ cập nhật Windows để tải file từ GitHub, xin chờ...';
    const result=await message({type:'local-updater-update'});
    status.textContent='Đã cập nhật v'+result.version+'. Đang tải lại Chrome Extension...';
    notify('Cập nhật thành công. Tool sẽ tải lại.');
    setTimeout(()=>{try{chrome.runtime.reload();}catch(e){notify('Đã cập nhật. Hãy bấm Reload tại chrome://extensions.',false);}},1800);
    // A hard page refresh ensures open tabs render files from the newly installed version.
    setTimeout(()=>location.reload(),3600);
  }catch(e){
    status.textContent='Không cập nhật được: '+e.message;
    notify(e.message,false);
  }finally{btn.disabled=false;}
};
$('checkGitUpdate').onclick=async()=>{
  const btn=$('checkGitUpdate');btn.disabled=true;$('gitUpdateStatus').textContent='Đang đối chiếu phiên bản trên GitHub...';
  try{
    const result=await message({type:'github-update-check'});
    $('gitUpdateStatus').textContent=result.updateAvailable
      ?`Có phiên bản mới: ${result.latestVersion} (đang dùng ${result.currentVersion}). Hãy bấm Cập nhật ngay từ GitHub.`
      :result.upToDate?`Đã là phiên bản mới nhất: ${result.currentVersion}.`:
        `Phiên bản trên GitHub: ${result.latestVersion}, hiện tại: ${result.currentVersion}. Không cần hạ cấp.`;
    notify(result.updateAvailable?'Phát hiện bản cập nhật từ GitHub.':'Đã kiểm tra phiên bản trên GitHub.');
  }catch(e){$('gitUpdateStatus').textContent='Kiểm tra thất bại: '+e.message;notify(e.message,false)}
  finally{btn.disabled=false;}
};
$('updateFromGit').onclick=async()=>{
  const steps='1) Mở thư mục đã giải nén/cài DHL Product Factory trên máy.\n2) Nhấp đúp CAP-NHAT-TOOL.cmd, chờ tải mã từ GitHub.\n3) Mở chrome://extensions và nhấn Reload trên DHL Product Factory.\nGiữ nguyên thư mục cài đặt và manifest OAuth; không cần Load unpacked lại.';
  $('gitUpdateStatus').textContent=steps;
  try{await navigator.clipboard.writeText(steps);notify('Đã sao chép hướng dẫn. Nhấp đúp CAP-NHAT-TOOL.cmd trong thư mục cài để cập nhật.');}
  catch{notify('Mở thư mục cài và chạy CAP-NHAT-TOOL.cmd; sau đó nhấn Reload.');}
  chrome.tabs.create({url:'chrome://extensions'});
};
