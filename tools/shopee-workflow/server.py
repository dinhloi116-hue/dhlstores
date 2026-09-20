#!/usr/bin/env python3
import os, sys, json, mimetypes, urllib.request, urllib.error, re, zipfile, io, html, hashlib, tempfile, subprocess, threading, time, gzip
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from xml.etree import ElementTree as ET
from datetime import datetime

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / 'static'
DATA = ROOT / 'data'
HOST = os.getenv('HOST', '127.0.0.1')
PORT = int(os.getenv('PORT', '3131'))
VERSION_FILE = ROOT / 'VERSION'
CURRENT_VERSION = VERSION_FILE.read_text(encoding='utf-8').strip() if VERSION_FILE.exists() else '1.0.0'
UPDATE_MANIFEST_URL = os.getenv('UPDATE_MANIFEST_URL', 'https://raw.githubusercontent.com/dinhloi116-hue/dhlstores/shopee-workflow-tool/tools/shopee-workflow/update_manifest.json')


def bootstrap_packaged_data():
    # Repo/auto-update có thể lưu database ở dạng gzip để nhẹ hơn; mỗi lần chạy sẽ bung ra file runtime.
    for name in ('categories.json','keywords.json','shopee_template.b64'):
        gz=DATA/(name+'.gz')
        out=DATA/name
        if gz.exists():
            try:
                out.write_bytes(gzip.decompress(gz.read_bytes()))
            except Exception as e:
                print(f'[WARN] Không bung được {gz.name}: {e}')
    b64=DATA/'shopee_template.b64'
    xlsx=DATA/'shopee_template.xlsx'
    if b64.exists():
        try:
            import base64
            xlsx.write_bytes(base64.b64decode(b64.read_text(encoding='ascii')))
        except Exception as e:
            print(f'[WARN] Không dựng được template xlsx: {e}')

bootstrap_packaged_data()

# Tiny .env.local loader. Values in process env win.
env_path = ROOT / '.env.local'
if env_path.exists():
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line=line.strip()
        if not line or line.startswith('#') or '=' not in line: continue
        k,v=line.split('=',1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
ET.register_namespace('', NS_MAIN)
ET.register_namespace('r', NS_REL)

COLS = {
    'A':'categoryId','B':'title','C':'description','D':'maxQty','E':'maxStart','F':'maxPeriod','G':'maxEnd',
    'H':'parentSku','I':'productCode','J':'variation1Name','K':'option1','L':'variantImageUrl','M':'variation2Name','N':'option2',
    'O':'price','P':'myPrice','Q':'phPrice','R':'stock','S':'variantSku','T':'sizeChartTemplate','U':'sizeChartImage','V':'gtin',
    'W':'coverUrl','X':'img1','Y':'img2','Z':'img3','AA':'img4','AB':'img5','AC':'img6','AD':'img7','AE':'img8',
    'AF':'weightKg','AG':'length','AH':'width','AI':'height','AJ':'shipAJ','AK':'shipAK','AL':'shipAL','AM':'shipAM','AN':'shipAN','AO':'shipAO','AP':'shipAP','AQ':'preorder','AR':'reason'
}


def a1_col_num(col):
    n=0
    for ch in col:
        n=n*26+ord(ch)-64
    return n


def is_number(v):
    return isinstance(v,(int,float)) and not isinstance(v,bool)


def make_cell(col, rownum, value):
    q = f'{{{NS_MAIN}}}'
    c = ET.Element(q+'c', {'r': f'{col}{rownum}'})
    if value is None or value == '':
        return None
    if is_number(value):
        v=ET.SubElement(c,q+'v'); v.text=str(value)
        return c
    if col in {'O','R','AF','AG','AH','AI','AQ'}:
        try:
            num=float(value)
            v=ET.SubElement(c,q+'v'); v.text=str(int(num) if num.is_integer() else num)
            return c
        except Exception:
            pass
    c.set('t','inlineStr')
    isel=ET.SubElement(c,q+'is')
    t=ET.SubElement(isel,q+'t')
    text=str(value)
    if text.startswith(' ') or text.endswith(' '):
        t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    t.text=text
    return c


def build_export_rows(products):
    out=[]
    for p in products:
        variants=p.get('variants') or []
        if not variants:
            variants=[{}]
        imgs=(p.get('extraImages') or [])[:8]
        for v in variants:
            price=v.get('price') or p.get('price') or 0
            stock=v.get('stock') if v.get('stock') is not None else p.get('stock',100)
            weight_g=v.get('chargeableWeightGram') or p.get('chargeableWeightGram') or 0
            row={
                'categoryId':p.get('categoryId',''),
                'title':p.get('title',''),
                'description':p.get('description',''),
                'parentSku':p.get('parentSku',''),
                'productCode':p.get('productCode') or re.sub(r'[^A-Za-z0-9]','',p.get('parentSku','')),
                'variation1Name':p.get('variation1Name','Mẫu') if len(variants)>1 else '',
                'option1':v.get('name','') if len(variants)>1 else '',
                'variantImageUrl':v.get('imageUrl',''),
                'variation2Name':v.get('variation2Name',''),
                'option2':v.get('option2',''),
                'price':int(round(float(price))) if price else '',
                'stock':int(stock) if stock not in (None,'') else '',
                'variantSku':v.get('sku','') if len(variants)>1 else (v.get('sku') or p.get('parentSku','')),
                'coverUrl':p.get('coverUrl',''),
                'weightKg':round(float(weight_g)/1000,4) if weight_g else '',
                'length':v.get('length') or p.get('length',''),
                'width':v.get('width') or p.get('width',''),
                'height':v.get('height') or p.get('height',''),
                'preorder':p.get('preorder',''),
                'reason':''
            }
            for i,img in enumerate(imgs,1): row[f'img{i}']=img
            channels=p.get('shippingChannels') or {}
            for col in ['AJ','AK','AL','AM','AN','AO','AP']:
                row['ship'+col]=channels.get(col,'')
            out.append(row)
    return out


def export_xlsx(products):
    template=DATA/'shopee_template.xlsx'
    if not template.exists():
        b64=DATA/'shopee_template.b64'
        if b64.exists():
            import base64
            template.write_bytes(base64.b64decode(b64.read_text(encoding='ascii')))
    if not template.exists(): raise RuntimeError('Thiếu template Shopee gốc.')
    rows=build_export_rows(products)
    src=zipfile.ZipFile(template,'r')
    wb_root=ET.fromstring(src.read('xl/workbook.xml'))
    rel_root=ET.fromstring(src.read('xl/_rels/workbook.xml.rels'))
    qmain=f'{{{NS_MAIN}}}'; qrel=f'{{{NS_REL}}}'
    relmap={r.attrib['Id']:r.attrib['Target'] for r in rel_root}
    target=None
    sheets=wb_root.find(qmain+'sheets')
    for s in sheets:
        if s.attrib.get('name')=='Bản đăng tải':
            rid=s.attrib.get(qrel+'id'); target='xl/'+relmap[rid]
            break
    if not target: raise RuntimeError('Không tìm thấy sheet Bản đăng tải.')
    sheet_root=ET.fromstring(src.read(target))
    sheet_data=sheet_root.find(qmain+'sheetData')
    for r in list(sheet_data):
        if r.tag==qmain+'row' and int(r.attrib.get('r','0'))>=7:
            sheet_data.remove(r)
    start=7
    for idx,data in enumerate(rows,start):
        row_el=ET.SubElement(sheet_data,qmain+'row',{'r':str(idx)})
        for col,key in COLS.items():
            cell=make_cell(col,idx,data.get(key,''))
            if cell is not None: row_el.append(cell)
    dim=sheet_root.find(qmain+'dimension')
    if dim is not None:
        dim.set('ref',f'A1:AR{max(6,6+len(rows))}')
    new_sheet=ET.tostring(sheet_root,encoding='utf-8',xml_declaration=True)
    buf=io.BytesIO()
    with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as out:
        for info in src.infolist():
            data=new_sheet if info.filename==target else src.read(info.filename)
            out.writestr(info,data)
    src.close()
    return buf.getvalue(), len(rows)


def extract_output_text(obj):
    if isinstance(obj,dict) and isinstance(obj.get('output_text'),str): return obj['output_text']
    parts=[]
    for item in obj.get('output',[]) if isinstance(obj,dict) else []:
        if item.get('type')=='message':
            for c in item.get('content',[]):
                if c.get('type') in ('output_text','text') and c.get('text'): parts.append(c['text'])
    return '\n'.join(parts)


def call_openai(payload):
    key=os.getenv('OPENAI_API_KEY','').strip()
    if not key: raise RuntimeError('Chưa cấu hình OPENAI_API_KEY trong .env.local')
    req=urllib.request.Request('https://api.openai.com/v1/responses',data=json.dumps(payload).encode('utf-8'),method='POST')
    req.add_header('Authorization','Bearer '+key)
    req.add_header('Content-Type','application/json')
    try:
        with urllib.request.urlopen(req,timeout=180) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail=e.read().decode('utf-8','replace')
        raise RuntimeError(f'OpenAI API {e.code}: {detail[:1200]}')


def version_tuple(v):
    nums=re.findall(r'\d+', str(v))[:3]
    return tuple((list(map(int,nums))+[0,0,0])[:3])

def fetch_bytes(url, timeout=45):
    req=urllib.request.Request(url, headers={'User-Agent':'ShopeeWorkflowUpdater/1.0','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()

def fetch_update_manifest():
    raw=fetch_bytes(UPDATE_MANIFEST_URL, timeout=20)
    obj=json.loads(raw.decode('utf-8'))
    if not isinstance(obj,dict) or not obj.get('version') or not isinstance(obj.get('files'),list):
        raise RuntimeError('Manifest cập nhật không hợp lệ.')
    return obj

def safe_update_path(rel):
    rel=str(rel).replace('\\','/').lstrip('/')
    if not rel or rel.startswith('.') or '..' in Path(rel).parts:
        raise RuntimeError(f'Đường dẫn cập nhật không hợp lệ: {rel}')
    dest=(ROOT/rel).resolve()
    if ROOT.resolve() not in dest.parents and dest != ROOT.resolve():
        raise RuntimeError(f'Đường dẫn cập nhật vượt thư mục tool: {rel}')
    if dest.name=='.env.local':
        raise RuntimeError('Không được ghi đè .env.local')
    return dest

def apply_update_manifest(manifest):
    temp_root=Path(tempfile.mkdtemp(prefix='shopee_wf_update_'))
    downloaded=[]
    try:
        for f in manifest.get('files',[]):
            rel=f.get('path','')
            url=f.get('url','')
            expected=(f.get('sha256') or '').lower()
            if not rel or not url:
                raise RuntimeError('Manifest thiếu path/url.')
            safe_update_path(rel)
            data=fetch_bytes(url, timeout=60)
            actual=hashlib.sha256(data).hexdigest()
            if expected and actual != expected:
                raise RuntimeError(f'SHA256 không khớp: {rel}')
            tp=temp_root/rel
            tp.parent.mkdir(parents=True, exist_ok=True)
            tp.write_bytes(data)
            downloaded.append((rel,tp))
        for rel,tp in downloaded:
            dest=safe_update_path(rel)
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(tp,dest)
        b64=DATA/'shopee_template.b64'
        if any(rel=='data/shopee_template.b64' for rel,_ in downloaded) and b64.exists():
            import base64
            (DATA/'shopee_template.xlsx').write_bytes(base64.b64decode(b64.read_text(encoding='ascii')))
        return [rel for rel,_ in downloaded]
    finally:
        try:
            import shutil; shutil.rmtree(temp_root, ignore_errors=True)
        except Exception:
            pass

def launch_replacement_server(delay=1.5):
    root=str(ROOT); server=str(ROOT/'server.py'); py=sys.executable
    code=("import time,subprocess,os; time.sleep(%s); "
          "subprocess.Popen([%r,%r],cwd=%r%s)" % (delay,py,server,root,
          ", creationflags=(subprocess.DETACHED_PROCESS|subprocess.CREATE_NEW_PROCESS_GROUP)" if os.name=='nt' else ", start_new_session=True"))
    kwargs={'cwd':root}
    if os.name=='nt':
        kwargs['creationflags']=getattr(subprocess,'DETACHED_PROCESS',0)|getattr(subprocess,'CREATE_NEW_PROCESS_GROUP',0)
    else:
        kwargs['start_new_session']=True
    subprocess.Popen([py,'-c',code], **kwargs)


class Handler(BaseHTTPRequestHandler):
    server_version='ShopeeWorkflow/1.0'
    def log_message(self,fmt,*args):
        sys.stdout.write('[%s] %s\n' % (self.log_date_time_string(), fmt%args))
    def json_response(self,obj,status=200):
        data=json.dumps(obj,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def read_json(self):
        n=int(self.headers.get('Content-Length','0'))
        if n>40*1024*1024: raise ValueError('Payload quá lớn (>40MB).')
        return json.loads(self.rfile.read(n).decode('utf-8')) if n else {}
    def do_GET(self):
        path=self.path.split('?',1)[0]
        if path=='/api/health':
            return self.json_response({'ok':True,'version':CURRENT_VERSION,'openaiConfigured':bool(os.getenv('OPENAI_API_KEY'))})
        if path=='/api/update/check':
            try:
                m=fetch_update_manifest()
                latest=str(m.get('version','0.0.0'))
                return self.json_response({'ok':True,'currentVersion':CURRENT_VERSION,'latestVersion':latest,'updateAvailable':version_tuple(latest)>version_tuple(CURRENT_VERSION),'notes':m.get('notes','')})
            except Exception as e:
                return self.json_response({'ok':False,'currentVersion':CURRENT_VERSION,'error':str(e)},502)
        if path=='/': file=STATIC/'index.html'
        else:
            rel=path.lstrip('/')
            file=ROOT/rel
        try:
            file=file.resolve()
            if ROOT.resolve() not in file.parents and file!=ROOT.resolve(): raise FileNotFoundError
            if not file.exists() or not file.is_file(): raise FileNotFoundError
            data=file.read_bytes(); ctype=mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
            self.send_response(200); self.send_header('Content-Type',ctype); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        except FileNotFoundError:
            self.send_error(404)
    def do_POST(self):
        try:
            body=self.read_json()
            if self.path=='/api/update/apply':
                m=fetch_update_manifest()
                latest=str(m.get('version','0.0.0'))
                if version_tuple(latest) <= version_tuple(CURRENT_VERSION):
                    return self.json_response({'ok':True,'updated':False,'version':CURRENT_VERSION,'message':'Đang ở phiên bản mới nhất.'})
                changed=apply_update_manifest(m)
                response={'ok':True,'updated':True,'fromVersion':CURRENT_VERSION,'toVersion':latest,'changedFiles':changed,'restarting':True}
                self.json_response(response)
                launch_replacement_server()
                threading.Thread(target=lambda: (time.sleep(0.35), self.server.shutdown()), daemon=True).start()
                return
            if self.path=='/api/export':
                products=body.get('products') or []
                if not products: return self.json_response({'error':'Chưa có sản phẩm để xuất.'},400)
                data,row_count=export_xlsx(products)
                name=f"Shopee_MassUpload_{re.sub(r'[^A-Za-z0-9_-]+','_',body.get('shopName','Shop'))}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                self.send_response(200)
                self.send_header('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                self.send_header('Content-Disposition',f'attachment; filename="{name}"')
                self.send_header('X-Row-Count',str(row_count))
                self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data); return
            if self.path=='/api/ai':
                model=body.get('model') or os.getenv('OPENAI_MODEL') or 'gpt-4.1-mini'
                prompt=body.get('prompt','')
                content=[]
                for f in body.get('files',[])[:10]:
                    mime=f.get('mime','application/octet-stream'); data=f.get('dataUrl',''); name=f.get('name','file')
                    if not data: continue
                    if mime.startswith('image/'):
                        content.append({'type':'input_image','image_url':data,'detail':'high'})
                    else:
                        content.append({'type':'input_file','filename':name,'file_data':data})
                content.append({'type':'input_text','text':prompt})
                payload={'model':model,'input':[{'role':'user','content':content}],'store':False}
                resp=call_openai(payload)
                return self.json_response({'text':extract_output_text(resp),'usage':resp.get('usage',{}),'model':resp.get('model',model)})
            return self.json_response({'error':'Không tìm thấy API.'},404)
        except Exception as e:
            return self.json_response({'error':str(e)},500)

if __name__=='__main__':
    print(f'Shopee Workflow đang chạy tại http://{HOST}:{PORT}')
    print('Nhấn Ctrl+C để dừng.')
    httpd=ThreadingHTTPServer((HOST,PORT),Handler)
    httpd.serve_forever()
