// Pure, deterministic mapping of user-confirmed sale types and variant dimensions.
// Never infer inventory, prices, colors or sizes from photos or model output.
export const SALE_TYPES=Object.freeze(['Làm sẵn','Nguyên liệu DIY','Không in','Có in']);
export const DIMENSIONS=Object.freeze({color:'Màu sắc',size:'Kích cỡ',type:'Kiểu / loại'});
export function splitOptions(raw){
  return [...new Set(String(raw||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean))];
}
function skuPiece(v){
  return String(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toUpperCase().slice(0,16)||'OPT';
}
export function makeSaleVariants({sku,dimensions=[],colors='',sizes='',saleTypes=[]}){
  const selected=[...new Set(dimensions)];
  if(selected.length>2)throw Error('Mỗi sản phẩm đăng sàn chỉ hỗ trợ tối đa 2 nhóm phân loại. Hãy bỏ tích một nhóm hoặc tách sản phẩm.');
  if(selected.some(d=>!Object.hasOwn(DIMENSIONS,d)))throw Error('Nhóm phân loại không hợp lệ.');
  const cleanedTypes=[...new Set(saleTypes)];
  if(cleanedTypes.some(x=>!SALE_TYPES.includes(x)))throw Error('Loại bán không hợp lệ.');
  const values={color:splitOptions(colors),size:splitOptions(sizes),type:cleanedTypes};
  const options=selected.map(x=>values[x]);
  for(let i=0;i<selected.length;i++)if(!options[i].length)throw Error('Chưa có lựa chọn cho nhóm '+DIMENSIONS[selected[i]]+'.');
  let combos=[[]];
  for(const names of options)combos=combos.flatMap(c=>names.map(n=>[...c,n]));
  if(combos.length>80)throw Error('Quá 80 SKU. Hãy chia nhỏ thành nhiều sản phẩm.');
  const prefix=String(sku||'').trim();if(!prefix)throw Error('Cần nhập SKU gốc trước khi tạo các dòng phân loại.');
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(prefix))throw Error('SKU gốc chỉ dùng chữ không dấu, số, gạch ngang và gạch dưới, tối đa 80 ký tự.');
  const used=new Set();
  const rows=combos.map((parts,index)=>{
    let code=parts.length?`${prefix}-${parts.map(skuPiece).join('-')}`:prefix;
    if(used.has(code))code+=`-${index+1}`;
    used.add(code);
    return {sku:code,opt1:parts[0]||'',opt2:parts[1]||'',price:'',stock:''};
  });
  return {variantName1:selected[0]?DIMENSIONS[selected[0]]:'',variantName2:selected[1]?DIMENSIONS[selected[1]]:'',rows};
}
export function serializeSkuLines(rows){
  for(const row of rows){if([row.sku,row.opt1,row.opt2,row.price,row.stock].some(s=>String(s??'').includes('|')))throw Error('SKU và phân loại không được chứa dấu |.');}
  return rows.map(r=>[r.sku,r.opt1,r.opt2,r.price,r.stock].map(v=>String(v??'').trim()).join(' | ')).join('\n');
}
export function parseSkuLines(text){
  return String(text||'').split(/\r?\n/).filter(l=>l.trim()).map((line,i)=>{
    const arr=line.split('|').map(x=>x.trim());
    if(arr.length!==5)throw Error('Dòng SKU '+(i+1)+' phải gồm SKU | Loại 1 | Loại 2 | Giá | Tồn.');
    const [sku,opt1,opt2,price,stock]=arr;
    if(!sku)throw Error('Thiếu SKU dòng '+(i+1));
    if(price!==''&&(!/^\d+(?:\.\d+)?$/.test(price)||Number(price)<=0))throw Error('Sai giá bán dòng '+(i+1));
    if(stock!==''&&(!/^\d+$/.test(stock)))throw Error('Sai tồn kho dòng '+(i+1));
    return {sku,opt1,opt2,price,stock};
  });
}
export function saleSummary({saleTypes=[],dimensions=[],colors='',sizes='',variants=''}){
  return [saleTypes.length?'Hình thức: '+saleTypes.join(', '):'',dimensions.includes('color')?'Màu: '+splitOptions(colors).join(', '):'',dimensions.includes('size')?'Size: '+splitOptions(sizes).join(', '):'',variants?String(variants).trim():''].filter(Boolean).join(' | ');
}
