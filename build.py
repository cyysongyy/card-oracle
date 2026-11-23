# 產生單一檔案版 deploy/index.html：把 CSS、JS、所有牌組資料與插圖內嵌，只需上傳這一個檔案
import re,os
root=os.path.dirname(os.path.abspath(__file__))
h=open(os.path.join(root,'index.html'),encoding='utf-8').read()
def rd(p): return open(os.path.join(root,p),encoding='utf-8').read()
h=re.sub(r'<link rel="stylesheet" href="(assets/style.css)">',lambda m:'<style>\n'+rd(m.group(1))+'\n</style>',h)
def inl(m):
    src=m.group(1)
    if src.startswith('http'): return m.group(0)
    return '<script>\n'+rd(src).replace('</script>','<\\/script>')+'\n</script>'
h=re.sub(r'<script src="([^"]+)"></script>',inl,h)
os.makedirs(os.path.join(root,'deploy'),exist_ok=True)
open(os.path.join(root,'deploy','index.html'),'w',encoding='utf-8').write(h)
print(len(h))
