const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const bool=v=>String(v??'').toLowerCase()==='true';

export async function onRequestGet({env}){
  const checkoutEnabled=bool(env.CHECKOUT_ENABLED);
  const codConfigured=bool(env.COD_ENABLED);
  const promptpayConfigured=Boolean(env.PROMPTPAY_PROVIDER&&env.PROMPTPAY_MERCHANT_ID&&env.PROMPTPAY_WEBHOOK_SECRET);
  const gatewayConfigured=Boolean(env.PAYMENT_GATEWAY_PROVIDER&&env.PAYMENT_GATEWAY_MERCHANT_ID&&env.PAYMENT_GATEWAY_WEBHOOK_SECRET);
  const onlinePaymentsEnabled=checkoutEnabled&&bool(env.ONLINE_PAYMENTS_ENABLED);
  const codEnabled=checkoutEnabled&&codConfigured;
  const promptpayEnabled=onlinePaymentsEnabled&&promptpayConfigured&&String(env.PROMPTPAY_ENABLED??'true').toLowerCase()!=='false';
  const gatewayEnabled=onlinePaymentsEnabled&&gatewayConfigured&&String(env.PAYMENT_GATEWAY_ENABLED??'true').toLowerCase()!=='false';

  const methods=[
    {
      id:'COD',
      label:'เก็บเงินปลายทาง (COD)',
      enabled:codEnabled,
      online:false,
      readiness:codEnabled?'ready':(codConfigured?'configured_checkout_disabled':'not_configured')
    },
    {
      id:'PROMPTPAY',
      label:'พร้อมเพย์ / QR Payment',
      enabled:promptpayEnabled,
      online:true,
      readiness:promptpayConfigured?(onlinePaymentsEnabled?'ready':(checkoutEnabled?'configured_not_enabled':'configured_checkout_disabled')):'not_configured'
    },
    {
      id:'GATEWAY',
      label:'ชำระเงินออนไลน์',
      enabled:gatewayEnabled,
      online:true,
      readiness:gatewayConfigured?(onlinePaymentsEnabled?'ready':(checkoutEnabled?'configured_not_enabled':'configured_checkout_disabled')):'not_configured'
    }
  ];

  return json({
    version:'1.0',
    currency:'THB',
    checkoutEnabled,
    methods:methods.filter(x=>x.enabled),
    capabilities:methods,
    onlinePaymentsReady:promptpayEnabled||gatewayEnabled,
    policy:{
      explicitCheckoutEnableRequired:true,
      providerVerifiedBeforeDisplay:true,
      webhookRequiredForOnlinePayment:true,
      receiptAfterConfirmedCollection:true
    }
  });
}
