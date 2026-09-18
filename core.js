(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.QuoteFlow=api;
})(typeof self!=="undefined"?self:this,function(){
  function num(v){
    const n=Number(String(v??"").replace(",","."));
    return Number.isFinite(n)?n:0;
  }
  function moneyRound(v){
    return Math.round((v+Number.EPSILON)*100)/100;
  }
  function normalizeLine(line){
    return {
      description:String(line.description??"").trim(),
      qty:Math.max(0,num(line.qty)),
      unitPrice:Math.max(0,num(line.unitPrice)),
      discountPct:Math.min(100,Math.max(0,num(line.discountPct)))
    };
  }
  function calculate(lines,taxRate){
    const normalized=(lines||[]).map(normalizeLine).filter(x=>x.description||x.qty||x.unitPrice);
    let gross=0,discountTotal=0;
    const items=normalized.map(x=>{
      const lineGross=moneyRound(x.qty*x.unitPrice);
      const discount=moneyRound(lineGross*x.discountPct/100);
      const net=moneyRound(lineGross-discount);
      gross=moneyRound(gross+lineGross);
      discountTotal=moneyRound(discountTotal+discount);
      return {...x,lineGross,discount,net};
    });
    const subtotal=moneyRound(gross-discountTotal);
    const rate=Math.max(0,num(taxRate));
    const tax=moneyRound(subtotal*rate/100);
    const total=moneyRound(subtotal+tax);
    return {items,gross,discountTotal,subtotal,taxRate:rate,tax,total};
  }
  function escapeCsv(v){
    const s=String(v??"");
    return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
  }
  function toCSV(result){
    const head=["Descrizione","Quantità","Prezzo unitario","Sconto %","Totale riga"];
    const rows=result.items.map(x=>[x.description,x.qty,x.unitPrice.toFixed(2),x.discountPct.toFixed(2),x.net.toFixed(2)]);
    rows.push(["Subtotale","","","",result.subtotal.toFixed(2)]);
    rows.push(["Imposta "+result.taxRate+"%","","","",result.tax.toFixed(2)]);
    rows.push(["Totale","","","",result.total.toFixed(2)]);
    return [head,...rows].map(r=>r.map(escapeCsv).join(",")).join("\n");
  }
  return {normalizeLine,calculate,toCSV};
});
