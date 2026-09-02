from pathlib import Path

hotfix = Path('public/tshop-v161-hotfix.js')
text = hotfix.read_text(encoding='utf-8')
old = "if(typeof document==='undefined'||window.__KCH_THAI_FIRST__==='1.23.0')return;"
new = "if(typeof document==='undefined'||typeof document.createElement!=='function'||window.__KCH_THAI_FIRST__==='1.23.0')return;"
if old in text:
    text = text.replace(old, new)
    hotfix.write_text(text, encoding='utf-8')
    print('Patched Thai-first runtime guard for test/browser compatibility')
else:
    print('Guard already compatible or Thai runtime not embedded')
