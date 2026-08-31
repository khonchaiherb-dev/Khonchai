/* KHONCHAIHERB Commerce v1.2.1 — packing verification shipment gate UX */
if(typeof v11Ship==='function'){
  v11Ship=async function(orderNo){
    const carrier=prompt('บริษัทขนส่ง เช่น Flash / Kerry / ไปรษณีย์ไทย','')||'';
    const trackingNo=prompt('เลขพัสดุ','')||'';
    if(trackingNo.trim().length<5){toast('กรุณากรอกเลขพัสดุจริง');return}
    try{
      await v10AdminFetch('/api/admin/order-action',{method:'POST',body:JSON.stringify({orderNo,action:'shipped',carrier,trackingNo})});
      toast('บันทึกการจัดส่งและตัดสต๊อกจริงแล้ว');
      v11FulfillmentModal();
    }catch(e){
      if(e?.data?.error==='packing_verification_required'){
        const verified=Number(e.data.verifiedQty||0),expected=Number(e.data.expectedQty||0);
        toast(`ต้องตรวจแพ็กให้ครบก่อนส่ง (${verified}/${expected} ชิ้น)`);
        if(typeof v12PackingModal==='function')setTimeout(()=>v12PackingModal(orderNo),180);
        return;
      }
      if(e?.data?.error==='tracking_required'){toast('กรุณากรอกเลขพัสดุจริง');return}
      toast('บันทึกการจัดส่งไม่สำเร็จ');
    }
  };
}
