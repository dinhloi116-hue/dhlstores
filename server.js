import express from 'express';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8080);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
app.use(express.json({limit:'40mb'}));
app.use(express.static(path.join(__dirname,'public')));

app.get('/api/health',(_req,res)=>res.json({ok:true,model:MODEL,geminiConfigured:Boolean(process.env.GEMINI_API_KEY)}));

function fromDataUrl(s){const m=/^data:([^;]+);base64,(.+)$/s.exec(String(s||''));return m?{mimeType:m[1],data:m[2]}:null}
app.post('/api/analyze',async(req,res)=>{
  try{
    if(!process.env.GEMINI_API_KEY) throw new Error('Chưa cấu hình GEMINI_API_KEY');
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const parts=[];
    for(const f of (req.body.files||[]).slice(0,10)){
      const d=fromDataUrl(f.dataUrl); if(!d)continue;
      if(d.mimeType.startsWith('image/')||d.mimeType==='application/pdf'||d.mimeType.startsWith('text/'))parts.push({inlineData:d});
    }
    parts.push({text:`Bạn là hệ thống phân tích sản phẩm Shopee Việt Nam. Đọc toàn bộ nguồn. Trả CHỈ JSON hợp lệ theo schema: {"productName":"","material":"","colors":"","dimensions":"","productWeightGram":0,"features":[],"variants":[],"categoryIntent":{"l1":"","l2":"","l3":"","keywords":[],"query":""}}. Không tự bịa. productWeightGram chỉ là trọng lượng sản phẩm nguồn, tuyệt đối không thay khối lượng tính cước người dùng nhập. Khi gợi ý ngành hãy dựa NGHĨA sản phẩm, ví dụ khăn lau tay dùng bếp/phòng tắm ưu tiên Nhà cửa & Đời sống > Đồ dùng phòng tắm. Ghi chú người dùng: ${req.body.note||''}`});
    const out=await ai.models.generateContent({model:MODEL,contents:[{role:'user',parts}],config:{temperature:0.2}});
    res.json({text:out.text||''});
  }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/seo',async(req,res)=>{
  try{
    if(!process.env.GEMINI_API_KEY) throw new Error('Chưa cấu hình GEMINI_API_KEY');
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const p=req.body.product||{};
    const prompt=`Viết nội dung Shopee tiếng Việt. Trả CHỈ JSON {"titles":[3 tiêu đề],"description":"..."}. Không bịa thông số. Dữ liệu: ${JSON.stringify(p)}`;
    const out=await ai.models.generateContent({model:MODEL,contents:prompt,config:{temperature:0.3}});
    res.json({text:out.text||''});
  }catch(e){res.status(500).json({error:e.message})}
});

const COLS={A:'categoryId',B:'title',C:'description',H:'parentSku',I:'productCode',J:'variation1Name',K:'option1',L:'variantImageUrl',O:'price',R:'stock',S:'variantSku',W:'coverUrl',AF:'weightKg'};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function cell(c,r,v){if(v===''||v==null)return'';if(typeof v==='number')return`<c r="${c}${r}"><v>${v}</v></c>`;return`<c r="${c}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`}
function rows(products){const out=[];for(const p of products||[]){const vs=p.variants?.length?p.variants:[{}];for(const v of vs)out.push({categoryId:p.categoryId||'',title:p.title||'',description:p.description||'',parentSku:p.parentSku||'',productCode:(p.parentSku||'').replace(/\W/g,''),variation1Name:vs.length>1?(p.variation1Name||'Mẫu'):'',option1:vs.length>1?(v.name||''):'',variantImageUrl:v.imageUrl||'',price:Number(v.price||p.price||0),stock:Number(v.stock??100),variantSku:v.sku||p.parentSku||'',coverUrl:p.coverUrl||'',weightKg:Number(v.chargeableWeightGram||p.chargeableWeightGram||0)/1000})}return out}
function target(workbook,rels){const sm=workbook.match(/<sheet[^>]*name="Bản đăng tải"[^>]*r:id="([^"]+)"/);if(!sm)throw new Error('Không thấy sheet Bản đăng tải');const rm=rels.match(new RegExp(`<Relationship[^>]*Id="${sm[1]}"[^>]*Target="([^"]+)"`));if(!rm)throw new Error('Không thấy relationship sheet');return ('xl/'+rm[1].replace(/^\//,'')).replace('xl/xl/','xl/')}
app.post('/api/export',async(req,res)=>{
  try{
    if(!req.body.templateBase64)return res.status(400).json({error:'Chưa nạp template Shopee gốc'});
    const zip=await JSZip.loadAsync(Buffer.from(req.body.templateBase64,'base64'));
    const wb=await zip.file('xl/workbook.xml').async('string'), rel=await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const file=target(wb,rel), xml=await zip.file(file).async('string'), data=rows(req.body.products||[]);
    const replaced=xml.replace(/<sheetData>([\s\S]*?)<\/sheetData>/,(_m,inner)=>{const keep=inner.replace(/<row\b[^>]*\br="(?:[7-9]|[1-9]\d+)"[\s\S]*?<\/row>/g,'');const add=data.map((o,i)=>{const r=i+7;return`<row r="${r}">${Object.entries(COLS).map(([c,k])=>cell(c,r,o[k])).join('')}</row>`}).join('');return`<sheetData>${keep}${add}</sheetData>`});
    zip.file(file,replaced);const buf=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="Shopee_MassUpload.xlsx"');res.send(buf);
  }catch(e){res.status(500).json({error:e.message})}
});

app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Shopee Workflow: ${PORT}`));
