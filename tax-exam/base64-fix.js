(()=>{
  const nativeAtob=window.atob.bind(window);
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function sanitize(input){
    return String(input)
      .replace(/-/g,'+')
      .replace(/_/g,'/')
      .replace(/[^A-Za-z0-9+/=]/g,'')
      .replace(/=/g,'');
  }

  function decodeForgiving(input){
    const s=sanitize(input);
    if(!s) return '';
    let bits=0, buffer=0, out='';
    const chunk=[];
    for(let i=0;i<s.length;i++){
      const v=alphabet.indexOf(s[i]);
      if(v<0) continue;
      buffer=(buffer<<6)|v;
      bits+=6;
      while(bits>=8){
        bits-=8;
        chunk.push(String.fromCharCode((buffer>>bits)&255));
        if(chunk.length>=8192){out+=chunk.join('');chunk.length=0;}
      }
      if(bits>0) buffer &= (1<<bits)-1;
      else buffer=0;
    }
    if(chunk.length) out+=chunk.join('');
    return out;
  }

  window.atob=input=>{
    const raw=String(input);
    try{
      return nativeAtob(raw);
    }catch(_){
      const cleaned=sanitize(raw);
      try{
        const mod=cleaned.length%4;
        if(mod!==1){
          const padded=cleaned+'='.repeat((4-mod)%4);
          return nativeAtob(padded);
        }
      }catch(__){}
      return decodeForgiving(cleaned);
    }
  };
})();
