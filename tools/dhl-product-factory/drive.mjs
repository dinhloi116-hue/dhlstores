// Google Drive READ-ONLY integration, OAuth refresh-token credentials stay server-side.
// This module deliberately contains no file mutation functions.
import {readZip,sheetRows} from './ooxml.mjs';
export const SHOP_NAMES=['DHL SPORTS','DHL STUDIO','RABBIT STORE','STORE MIU MIU','MIU CLOTHING & BEAUTY','PHONG THỦY KHÁNH HÒA'];
export function driveSettings(env=process.env){
 let folders={};try{folders=JSON.parse(env.DRIVE_SHOP_FOLDERS_JSON||'{}')}catch{throw Error('DRIVE_SHOP_FOLDERS_JSON phải là JSON object');}
 const configured=!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_REFRESH_TOKEN);
 return {configured,folders,pricingId:env.DRIVE_SHOPEE_PRICE_FILE_ID||'',bigsellerId:env.DRIVE_BIGSELLER_TEMPLATE_ID||'',lazadaId:env.DRIVE_LAZADA_TEMPLATE_ID||''};
}
const safeId=s=>typeof s==='string'&&/^[\w-]{12,160}$/.test(s);
export async function token(env=process.env,fetchImpl=fetch){
 const s=driveSettings(env);if(!s.configured)throw Error('Chưa cấu hình Google OAuth trên máy chủ');
 const body=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:env.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'});
 const r=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(20000)});
 const data=await r.json();if(!r.ok||!data.access_token)throw Error('Google OAuth không cấp được access token');return data.access_token;
}
async function requestGoogle(path,env,fetchImpl=fetch,asBytes=false){
 const access=await token(env,fetchImpl);const r=await fetchImpl('https://www.googleapis.com/drive/v3/'+path,{headers:{Authorization:`Bearer ${access}`},signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('Google Drive: HTTP '+r.status);
 return asBytes?Buffer.from(await r.arrayBuffer()):r.json();
}
export function permittedFolder(shop,env){const folders=driveSettings(env).folders;if(!SHOP_NAMES.includes(shop)||!safeId(folders[shop]))throw Error('Thư mục shop chưa cấu hình hoặc không hợp lệ');return folders[shop];}
export async function listShopFiles(shop,parentId='',env=process.env,fetchImpl=fetch){
 const folder=permittedFolder(shop,env);let target=folder;
 if(parentId){if(!safeId(parentId))throw Error('Thư mục không hợp lệ');const parent=await fileInfo(parentId,env,fetchImpl);
  if(parent.mimeType!=='application/vnd.google-apps.folder'||!parent.parents?.includes(folder))throw Error('Chỉ được mở thư mục sản phẩm trực tiếp trong shop');target=parentId;
 }
 const q=`'${target}' in parents and trashed = false`,files=[];let page='';
 for(let i=0;i<3;i++){const qs=new URLSearchParams({q,fields:'nextPageToken,files(id,name,mimeType,size,webViewLink,parents)',pageSize:'100'});if(page)qs.set('pageToken',page);
  const d=await requestGoogle('files?'+qs,env,fetchImpl);files.push(...(d.files||[]));page=d.nextPageToken||'';if(!page)break;
 }
 return files.map(({id,name,mimeType,size,webViewLink})=>({id,name,mimeType,size:Number(size||0),webViewLink:webViewLink||''}));
}
export async function fileInfo(id,env=process.env,fetchImpl=fetch){if(!safeId(id))throw Error('ID file không hợp lệ');return requestGoogle('files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,size,parents,md5Checksum',env,fetchImpl);}
export async function readShopFile(shop,id,env=process.env,fetchImpl=fetch){const folder=permittedFolder(shop,env);const info=await fileInfo(id,env,fetchImpl);
 const parents=Array.isArray(info.parents)?info.parents:[];let allowed=parents.includes(folder);
 if(!allowed&&parents.length===1){const parent=await fileInfo(parents[0],env,fetchImpl);allowed=parent.mimeType==='application/vnd.google-apps.folder'&&parent.parents?.includes(folder);}
 if(!allowed)throw Error('File không thuộc shop hoặc thư mục sản phẩm trực tiếp');
 const docx='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 const ok=['image/png','image/jpeg','image/webp','text/plain','text/markdown','application/json',docx];
 if(!ok.includes(info.mimeType)||Number(info.size||0)>5_000_000)throw Error('Chỉ đọc PNG/JPG/WEBP/TXT/MD/JSON/DOCX tối đa 5MB');
 const content=await requestGoogle('files/'+encodeURIComponent(id)+'?alt=media',env,fetchImpl,true);
 if(info.mimeType.startsWith('image/'))return {kind:'image',data:'data:'+info.mimeType+';base64,'+content.toString('base64'),name:info.name};
 if(info.mimeType===docx){const document=readZip(content).get('word/document.xml')?.toString('utf8')||'';const text=document.replace(/<\/?w:p(?:\s[^>]*)?>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');return {kind:'text',data:text.slice(0,16000),name:info.name};}
 return {kind:'text',data:content.toString('utf8').slice(0,16000),name:info.name};
}
export async function readConfiguredWorkbook(kind,env=process.env,fetchImpl=fetch){const cfg=driveSettings(env);const id=({bigseller:cfg.bigsellerId,lazada:cfg.lazadaId,pricing:cfg.pricingId})[kind];if(!safeId(id))throw Error('Chưa cấu hình ID file '+kind);
 const info=await fileInfo(id,env,fetchImpl);if(info.mimeType!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')throw Error('File mẫu '+kind+' phải là Excel .xlsx, không tự chuyển đổi Google Sheets');
 if(Number(info.size||0)>8_000_000)throw Error('File Excel vượt giới hạn 8 MB');const data=await requestGoogle('files/'+encodeURIComponent(id)+'?alt=media',env,fetchImpl,true);return {buffer:data,name:info.name,md5:info.md5Checksum||''};
}
function normalize(x){return String(x??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');}
export function lookupFees(original,category){
 const name=normalize(category);if(!name||name.length<4)throw Error('Cần nhập tên ngành hàng đầy đủ');const zip=readZip(original);const cats=sheetRows(zip,'Ngành hàng',3000),config=sheetRows(zip,'Cấu hình',35);
 const found=cats.slice(1).filter(r=>normalize(r.cells.G)===name);
 if(found.length!==1)return {match:false,matched:found.length,categories:found.map(r=>r.cells.G),notice:'Không khớp chính xác ngành hàng, yêu cầu chọn thủ công. Không tự áp dụng phí.'};
 const r=found[0];return {match:true,category:r.cells.G,feePercent:Number(r.cells.F||0)*100,source:`Ngành hàng!F${r.row}`,configuration:config.slice(1).filter(x=>x.cells.A&&x.cells.B!==undefined&&x.cells.B!=='').slice(0,18).map(x=>({name:x.cells.A,value:x.cells.B,source:`Cấu hình!B${x.row}`})),notice:'Chỉ là phí tham chiếu; người duyệt phải xác nhận điều kiện phí, quảng cáo và thuế thực tế trước khi tính.'};
}
