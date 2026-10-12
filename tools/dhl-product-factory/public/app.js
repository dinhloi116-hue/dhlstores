const $=id=>document.getElementById(id);
let password='',draft=null,currentLang='vi',images=[];
const fields={title:'Tên sản phẩm',short:'Mô tả ngắn',description:'Mô tả chi tiết',seoTitle:'Meta title',seoDescription:'Meta description',slug:'Slug URL',keywords:'Từ khóa SEO',altText:'Alt ảnh'};
function toast(s){const x=$('toast');x.textContent=s;x.style.display='block';clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>x.style.display='none',5000)}
async function api(url,data,blob=false){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-tool-password':password},body:JSON.stringify(data)});if(!res.ok){let msg='Lỗi server';try{msg=(await res.json()).error||msg}catch{}throw Error(msg)}return blob?res.blob():res.json()}
function payload(){return {shop:$('shop').value,name:$('name').value,sku:$('sku').value,category:$('category').value,variants:$('variants').value,notes:$('notes').value,images};}
function prices(){const keys=['cost','feePercent','packing','printing','labor','other','fixedFee','targetProfit'];return Object.fromEntries(keys.map(k=>[k,$(k).value]));}
$('connect').onclick=async()=>{password=$('password').value;try{const r=await fetch('/api/config',{headers:{'x-tool-password':password}});const j=await r.json();if(!r.ok)throw Error(j.error);$('connection').textContent=j.hasKey?'Đã kết nối · API sẵn sàng':'Đã kết nối · Thiếu GEMINI_API_KEY';$('connection').style.borderColor='#76cba7';toast('Đã xác nhận mật khẩu tool')}catch(e){toast(e.message)}};
$('images').onchange=async e=>{images=[];$('previews').replaceChildren();for(const f of [...e.target.files].slice(0,3)){if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5_000_000){toast('Bỏ qua '+f.name+': định dạng hoặc dung lượng không hợp lệ');continue}const data=await new Promise((resolve,reject)=>{const r=new FileReader;r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});images.push(data);const img=new Image;img.src=data;img.alt=f.name;$('previews').append(img)}if(e.target.files.length>3)toast('Chỉ nhận 3 ảnh đầu tiên')};
function render(){if(!draft)return;const d=draft[currentLang];$('draftState').textContent='Bản nháp · cần duyệt';$('draftForm').replaceChildren();const host=document.createElement('div');host.className='edit';for(const [key,label] of Object.entries(fields)){const row=document.createElement('label');row.textContent=label;const input=document.createElement(key==='description'||key==='short'||key==='seoDescription'?'textarea':'input');if(input.tagName==='TEXTAREA')input.rows=key==='description'?8:3;input.value=d[key];input.oninput=()=>draft[currentLang][key]=input.value;row.append(input);host.append(row)}$('draftForm').append(host);$('missing').hidden=!draft.missing.length;$('missing').textContent='Thông tin phải chốt: '+draft.missing.join(' • ');for(const id of ['exportInfo','exportSeo','exportPrice'])$(id).disabled=false;$('imageTool').hidden=false;}
for(const tab of document.querySelectorAll('.tab'))tab.onclick=()=>{for(const item of document.querySelectorAll('.tab'))item.classList.toggle('active',item===tab);currentLang=tab.dataset.lang;render()};
$('analyze').onclick=async()=>{const btn=$('analyze');btn.disabled=true;btn.textContent='Đang phân tích (có thể mất 1–2 phút)...';try{const r=await api('/api/analyze',payload());draft=r.draft;imagePrompts=[];$('promptList').replaceChildren();$('copyPrompts').disabled=true;$('savePrompts').disabled=true;render();toast('Đã tạo nội dung. Cần kiểm tra và chốt trước khi đăng.')}catch(e){toast(e.message)}finally{btn.disabled=false;btn.textContent='Phân tích ảnh & viết nội dung bằng Gemini'}};
$('pricing').onclick=async()=>{try{if($('cost').value==='')throw Error('Chưa nhập giá vốn. Không tự suy đoán.');const {price}=await api('/api/price',prices());$('priceResult').innerHTML='';const el=document.createElement('p');el.innerHTML=`Giá Shopee: <strong>${price.shopeePrice.toLocaleString('vi-VN')}đ</strong> · Thực thu: <strong>${Math.round(price.netReceived).toLocaleString('vi-VN')}đ</strong> · Lãi dự kiến: <strong>${Math.round(price.actualProfit).toLocaleString('vi-VN')}đ</strong> · Web/offline: <strong>${price.webOfflineSuggested.toLocaleString('vi-VN')}đ</strong>`;$('priceResult').append(el);}catch(e){toast(e.message)}};
async function exportFile(kind){if(!draft)return;try{const blob=await api('/api/export',{kind,draft,product:payload(),priceInput:prices()},true);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=({info:'THONG_TIN_SAN_PHAM_VI_EN.xlsx',seo:'SEO_WEB_VI_EN.xlsx',price:'BANG_GIA_DE_XUAT.xlsx'})[kind];link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Đã xuất file .xlsx chờ duyệt')}catch(e){toast(e.message)}}
$('exportInfo').onclick=()=>exportFile('info');$('exportSeo').onclick=()=>exportFile('seo');$('exportPrice').onclick=()=>exportFile('price');
let imagePrompts=[];
$('buildPrompts').onclick=async()=>{
 try{
  if(!draft)throw Error('Cần phân tích hoặc tải bản nháp sản phẩm trước khi tạo prompt');
  const response=await api('/api/prompts',{draft,product:payload(),count:9});
  imagePrompts=response.prompts;const host=$('promptList');host.replaceChildren();
  for(const item of imagePrompts){
   const card=document.createElement('section');card.className='prompt-card';
   const title=document.createElement('strong');title.textContent=`Ảnh ${item.index}: ${item.title}`;
   const note=document.createElement('p');note.textContent=item.kind==='requires-source-instruction'?'Lưu ý: cần đính kèm ảnh hướng dẫn gốc, không để AI tự vẽ lại.':'Đính kèm ảnh gốc của sản phẩm trước khi dán prompt.';
   const area=document.createElement('textarea');area.rows=5;area.value=item.prompt;area.oninput=()=>item.prompt=area.value;
   const button=document.createElement('button');button.textContent='Sao chép prompt ảnh '+item.index;
   button.onclick=async()=>{try{await navigator.clipboard.writeText(area.value);toast('Đã sao chép ảnh '+item.index+' — nhớ đính kèm ảnh nguồn khi gửi ChatGPT.')}catch(e){area.select();toast('Trình duyệt không cho sao chép: chọn và copy thủ công.')}};
   card.append(title,note,area,button);host.append(card);
  }
  $('copyPrompts').disabled=false;$('savePrompts').disabled=false;toast('Đã tạo 9 prompt. Không gọi API tạo ảnh.');
 }catch(e){toast(e.message)}
};
function allPrompts(){return imagePrompts.map(p=>`===== ẢNH ${p.index}: ${p.title} =====\n${p.prompt}`).join('\n\n');}
$('copyPrompts').onclick=async()=>{if(!imagePrompts.length)return;try{await navigator.clipboard.writeText(allPrompts());toast('Đã sao chép cả bộ prompt')}catch{toast('Không thể sao chép: dùng nút Tải TXT')}};
$('savePrompts').onclick=()=>{if(!imagePrompts.length)return;const blob=new Blob([allPrompts()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='PROMPT_ANH_CHATGPT_'+($('sku').value||'SAN_PHAM').replace(/[^a-zA-Z0-9_-]/g,'_')+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Đã tải bộ prompt TXT');};

// Phase 2: read-only Google Drive and official spreadsheet-template exports.
let driveFileCache=[],currentDriveFolder='';
$('shop').addEventListener('change',()=>{currentDriveFolder='';driveFileCache=[];$('driveFiles').textContent='Đã đổi shop, nhấn Xem file trong Drive.';});
$('loadDrive').onclick=async()=>{
 try{
  const r=await fetch('/api/drive/list?shop='+encodeURIComponent($('shop').value)+(currentDriveFolder?'&parentId='+encodeURIComponent(currentDriveFolder):''),{headers:{'x-tool-password':password}});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Google Drive chưa sẵn sàng');
  driveFileCache=data.files;$('driveFiles').replaceChildren();
  const allowed=['image/png','image/jpeg','image/webp','text/plain','text/markdown','application/json','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const shown=driveFileCache.filter(f=>allowed.includes(f.mimeType)&&f.size<=5_000_000);
  const folders=driveFileCache.filter(f=>f.mimeType==='application/vnd.google-apps.folder');
  if(currentDriveFolder){const back=document.createElement('button');back.textContent='← Quay về thư mục shop';back.onclick=()=>{currentDriveFolder='';$('loadDrive').click()};$('driveFiles').append(back)}
  for(const folder of folders){const btn=document.createElement('button');btn.textContent='📁 '+folder.name;btn.style.margin='4px';btn.onclick=()=>{currentDriveFolder=folder.id;$('loadDrive').click()};$('driveFiles').append(btn)}
  if(!shown.length&&!folders.length){$('driveFiles').textContent='Không có file ảnh/tài liệu phù hợp trong thư mục này.';return;}
  for(const f of shown){const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=f.id;checkbox.name='drive-selection';label.append(checkbox,document.createTextNode(' '+f.name+' ('+Math.ceil(f.size/1024)+' KB)'));$('driveFiles').append(label);}
  toast('Đã tải '+shown.length+' file dùng được từ Drive.');
 }catch(e){toast(e.message)}
};
$('importDrive').onclick=async()=>{
 try{
  const ids=[...document.querySelectorAll('input[name="drive-selection"]:checked')].map(x=>x.value);if(!ids.length)throw Error('Chưa chọn file từ Drive');
  const data=await api('/api/drive/source',{shop:$('shop').value,ids});
  for(const f of data.files){
   if(f.kind==='image'){if(images.length>=3)throw Error('Tối đa 3 ảnh trong một lượt');images.push(f.data);const img=new Image();img.src=f.data;img.alt=f.name;$('previews').append(img);}
   else{$('notes').value=($('notes').value+'\nNguồn '+f.name+':\n'+f.data).trim().slice(0,2000);}
  }
  toast('Đã thêm '+data.files.length+' file vào đầu vào, chỉ dùng để phân tích.');
 }catch(e){toast(e.message)}
};
$('lookupFee').onclick=async()=>{
 try{const d=await api('/api/drive/fees',{category:$('referenceCategory').value});
  const x=d.result;$('feeResult').textContent=x.match?`Ngành: ${x.category}\nPhí cố định tham chiếu: ${x.feePercent}% (nguồn ${x.source})\nCấu hình bổ sung: ${x.configuration.map(c=>c.name+': '+c.value).join('; ')}\n${x.notice}`:x.notice;
  if(x.match)toast('Đã tra ngành hàng. Hãy xác nhận tổng phí thực tế trước khi nhập.');
 }catch(e){toast(e.message)}
};
function listingPayload(){
 const variants=$('skuLines').value.split('\n').filter(s=>s.trim()).map((line,i)=>{
  const a=line.split('|').map(x=>x.trim());if(a.length!==5)throw Error('Dòng '+(i+1)+' cần: SKU | loại 1 | loại 2 | giá | tồn');
  return {sku:a[0],opt1:a[1],opt2:a[2],price:a[3],stock:a[4]};
 });
 return {reviewed:$('reviewed').checked,categoryConfirmed:$('categoryConfirmed').checked,brandConfirmed:$('brandConfirmed').checked,
  categoryId:$('categoryId').value,brand:$('brand').value,coverUrl:$('coverUrl').value,
  imageUrls:$('imageUrls').value.split('\n').map(x=>x.trim()).filter(Boolean),variantName1:$('variantName1').value,
  variantName2:$('variantName2').value,variants,weightGrams:$('weightGrams').value,lengthCm:$('lengthCm').value,
  widthCm:$('widthCm').value,heightCm:$('heightCm').value};
}
async function exportPlatform(platform){
 try{if(!draft)throw Error('Chưa có nội dung sản phẩm AI đã được duyệt');
  if(!confirm('Xuất bản nháp '+platform+'? File này chưa được kiểm nghiệm import trên sàn và không tự đăng bán.'))return;
  const blob=await api('/api/export-platform',{platform,draft,product:payload(),listing:listingPayload()},true);
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=platform.toUpperCase()+'_CHO_DUYET.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  toast('Xuất thành công. Kiểm tra và thử 1 SKU trên sàn trước khi nhập hàng loạt.');
 }catch(e){toast(e.message)}
}
$('exportBigseller').onclick=()=>exportPlatform('bigseller');$('exportLazada').onclick=()=>exportPlatform('lazada');
