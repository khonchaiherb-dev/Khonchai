(()=>{
  const nativeAtob=window.atob.bind(window);
  const EXPECTED_PART_SIZES=[6000,12000,12000,12000,12000,12000,12000,12000,12000,4940];
  const normalize=s=>String(s).replace(/[\r\n\t ]+/g,'').replace(/-/g,'+').replace(/_/g,'/');
  const decodePart=s=>{
    s=normalize(s).replace(/[^A-Za-z0-9+/=]/g,'');
    if(!s)return '';
    const firstPad=s.indexOf('=');
    if(firstPad!==-1)s=s.slice(0,firstPad)+s.slice(firstPad).replace(/[^=]/g,'');
    const mod=s.length%4;
    if(mod)s+='='.repeat(4-mod);
    return nativeAtob(s);
  };
  window.atob=input=>{
    const raw=String(input);
    try{return nativeAtob(raw)}catch(originalError){
      const compact=normalize(raw);
      let offset=0,out='';
      try{
        for(const size of EXPECTED_PART_SIZES){
          if(offset>=compact.length)break;
          const part=compact.slice(offset,offset+size);
          offset+=size;
          out+=decodePart(part);
        }
        if(offset<compact.length)out+=decodePart(compact.slice(offset));
        if(!out)throw originalError;
        return out;
      }catch(_){
        throw originalError;
      }
    }
  };
})();
