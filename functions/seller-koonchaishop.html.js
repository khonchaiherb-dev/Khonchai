const GUARD='/kch-koonchaishop-admin-readiness.js?v=1.0.1';

export async function onRequest({request,next}){
  const response=await next();
  if(!['GET','HEAD'].includes(request.method))return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html')||typeof HTMLRewriter==='undefined')return response;
  return new HTMLRewriter().on('head',{
    element(head){
      head.append(`<script defer src="${GUARD}"></script>`,{html:true});
    }
  }).transform(response);
}
