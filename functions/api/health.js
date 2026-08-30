export async function onRequestGet({env}){return Response.json({ok:true,service:'khonchaiherb-commerce',version:'0.2.0',d1:!!env.DB},{headers:{'Cache-Control':'no-store'}})}
