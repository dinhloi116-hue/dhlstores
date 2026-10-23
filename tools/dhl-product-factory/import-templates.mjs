// Import exporter: operates on a COPY of the user's actual BigSeller/Lazada XLSX.
// It retains all other sheets, hidden configuration, styles, validation and metadata.
import {readZip,sheetRows,patchRows} from './ooxml.mjs';
const value=(x)=>typeof x==='string'?x.trim():String(x??'').trim();
const positive=(v,label)=>{if(v===''||v===undefined||v===null||!Number.isFinite(Number(v))||Number(v)<=0)throw Error('Thiếu hoặc sai '+label);return Number(v);};
const integer=(v,label,nonNegative=false)=>{if(v===''||v==null||!Number.isInteger(Number(v))||Number(v)<(nonNegative?0:1))throw Error('Thiếu hoặc sai '+label);return Number(v);};
const checked=(v,label,max=255)=>{const s=value(v);if(!s||s.length>max)throw Error('Thiếu hoặc sai '+label);return s;};
const link=(v,label)=>{const x=checked(v,label,2048);if(!/^https:\/\//i.test(x))throw Error(label+' phải là đường dẫn https:// công khai');return x;};
const safeOptionalUrl=x=>x?link(x,'URL ảnh bổ sung'):'';
export function validateImport({platform,draft,product,listing},templateBytes){
 if(!['bigseller','lazada'].includes(platform))throw Error('Chỉ hỗ trợ BigSeller hoặc Lazada');
 if(!draft?.vi?.title||!draft?.vi?.description)throw Error('Thiếu nội dung tiếng Việt đã duyệt');
 if(product?.shop!=='DHL SPORTS'&&!['DHL STUDIO','RABBIT STORE','STORE MIU MIU','MIU CLOTHING & BEAUTY','PHONG THỦY KHÁNH HÒA'].includes(product?.shop))throw Error('Shop không hợp lệ');
 if(!listing?.reviewed)throw Error('Phải đánh dấu nội dung sản phẩm đã được duyệt');
 if(!listing?.categoryConfirmed)throw Error('Phải xác nhận mã ngành hàng lấy từ đúng sàn');
 const categoryId=integer(listing.categoryId,'mã danh mục '+platform);
 const cover=link(listing.coverUrl,'URL ảnh bìa'),photos=Array.isArray(listing.imageUrls)?listing.imageUrls.slice(0,8).map(safeOptionalUrl):[];
 const sku=checked(product.sku,'SKU sản phẩm',180);const title=checked(draft.vi.title,'tên sản phẩm',255);
 const desc=checked(draft.vi.description,'mô tả sản phẩm',10000);
 const variants=listing.variants;
 if(!Array.isArray(variants)||variants.length===0||variants.length>200)throw Error('Cần 1–200 dòng SKU/biến thể đã duyệt');
 const ids=new Set();const rows=variants.map((v,i)=>{
  const id=checked(v.sku,'SKU biến thể dòng '+(i+1),190);if(ids.has(id))throw Error('Trùng SKU: '+id);ids.add(id);
  const item={sku:id,price:positive(v.price,'giá bán dòng '+(i+1)),stock:integer(v.stock,'tồn kho dòng '+(i+1),true),opt1:value(v.opt1),opt2:value(v.opt2),image:v.image?safeOptionalUrl(v.image):''};
  if(item.opt1&&!listing.variantName1)throw Error('Cần tên phân loại 1');
  if(item.opt2&&(!item.opt1||!listing.variantName2))throw Error('Cần phân loại 1 và tên phân loại 2');
  return item;
 });
 const weightGrams=positive(listing.weightGrams,'cân nặng đóng gói (gram)');
 const dim=['lengthCm','widthCm','heightCm'].map(k=>positive(listing[k],k+' gói hàng'));
 if(platform==='lazada'&&!listing.brandConfirmed)throw Error('Phải xác nhận thương hiệu Lazada');
 const brand=platform==='lazada'?checked(listing.brand,'thương hiệu Lazada',180):'';
 const bytes=Buffer.from(templateBytes||[]);if(bytes.length>15_000_000)throw Error('Mẫu Excel quá lớn');
 const entries=readZip(bytes);let sourceHeaders;
 if(platform==='bigseller'){
  sourceHeaders=sheetRows(entries,'Sheet1',1)[0]?.cells;
  if(sourceHeaders?.A!=='ID danh mục*'||sourceHeaders?.B!=='Tên sản phẩm*'||sourceHeaders?.J!=='SKU'||sourceHeaders?.AE!=='Tình trạng')throw Error('Mẫu BigSeller không khớp file import_template_VN.xlsx đã xác minh');
 }else{
  sourceHeaders=sheetRows(entries,'template',1)[0]?.cells;
  if(sourceHeaders?.C!=='Danh mục ngành hàng'||sourceHeaders?.D!=='Tên sản phẩm'||sourceHeaders?.W!=='SellerSku'||sourceHeaders?.X!=='Khối lượng gói hàng (kg)')throw Error('Mẫu Lazada không khớp bản đã xác minh');
 }
 return {categoryId,cover,photos,sku,title,desc,rows,weightGrams,dim,brand,brandConfirmed:!!listing.brandConfirmed,variantName1:value(listing.variantName1),variantName2:value(listing.variantName2),supplierUrl:listing.supplierUrl?safeOptionalUrl(listing.supplierUrl):'',sizeChart:value(listing.sizeChart),bytes};
}
export function exportPlatformTemplate(input){
 const {platform,draft,product,listing,templateBytes}=input;
 const d=validateImport(input,templateBytes);
 if(platform==='bigseller'){
  const rows=d.rows.map(v=>({A:d.categoryId,B:d.title,C:d.supplierUrl,D:d.sku,E:d.desc,F:d.variantName1,G:v.opt1,H:d.variantName2,I:v.opt2,J:v.sku,K:v.stock,L:v.price,O:v.image,P:d.cover,Q:d.photos[0],R:d.photos[1],S:d.photos[2],T:d.photos[3],U:d.photos[4],V:d.photos[5],W:d.photos[6],X:d.photos[7],Y:d.sizeChart,Z:d.weightGrams,AA:d.dim[0],AB:d.dim[1],AC:d.dim[2]}));
  return patchRows(d.bytes,'Sheet1',1,rows); // removes the TWO original demo dresses
 }
 const rows=d.rows.map(v=>({A:d.sku,C:d.categoryId,D:d.title,E:draft.en?.title||'',F:d.cover,G:d.photos[0],H:d.photos[1],I:d.photos[2],J:d.photos[3],K:d.photos[4],L:d.photos[5],M:d.photos[6],N:d.brand,O:d.desc,Q:d.variantName1,R:v.opt1,S:v.image,T:d.variantName2,U:v.opt2,V:v.price,W:v.sku,X:Number((d.weightGrams/1000).toFixed(4)),Y:d.dim[1],Z:d.dim[0],AA:d.dim[2]}));
 return patchRows(d.bytes,'template',4,rows); // preserves 4 instruction rows and hidden sheets
}
