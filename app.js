const $=id=>document.getElementById(id);
let lines=[];
const money=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(v||0);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function todayISO(){
  const d=new Date(), off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}
function addLine(data={description:"",qty:1,unitPrice:0,discountPct:0}){
  lines.push({...data}); renderEditors(); renderPreview();
}
function removeLine(i){
  if(lines.length===1){lines=[{description:"",qty:1,unitPrice:0,discountPct:0}];}
  else lines.splice(i,1);
  renderEditors();renderPreview();
}
function updateLine(i,key,value){lines[i][key]=value;renderPreview();}

function renderEditors(){
  $("lineEditors").innerHTML=lines.map((x,i)=>
    '<div class="line-editor"><div class="row">'+
    '<label>Descrizione<input data-i="'+i+'" data-k="description" value="'+esc(x.description)+'" placeholder="Servizio o prodotto"></label>'+
    '<label>Q.tà<input type="number" min="0" step="0.01" data-i="'+i+'" data-k="qty" value="'+x.qty+'"></label>'+
    '<label>Prezzo €<input type="number" min="0" step="0.01" data-i="'+i+'" data-k="unitPrice" value="'+x.unitPrice+'"></label>'+
    '<label>Sconto %<input type="number" min="0" max="100" step="0.01" data-i="'+i+'" data-k="discountPct" value="'+x.discountPct+'"></label>'+
    '<button class="remove" data-remove="'+i+'" title="Rimuovi">×</button></div></div>'
  ).join("");
  $("lineEditors").querySelectorAll("input").forEach(input=>input.addEventListener("input",e=>updateLine(Number(e.target.dataset.i),e.target.dataset.k,e.target.value)));
  $("lineEditors").querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>removeLine(Number(btn.dataset.remove))));
}

function renderPreview(){
  const result=QuoteFlow.calculate(lines,$("taxRate").value);
  $("previewNo").textContent=$("quoteNo").value||"Preventivo";
  const d=$("quoteDate").value;
  $("previewDate").textContent=d?new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(d+"T12:00:00")):"";
  $("previewClient").textContent=$("clientName").value||"Cliente";
  $("previewRows").innerHTML=result.items.length?result.items.map(x=>
    '<tr><td>'+esc(x.description||"Voce")+'</td><td>'+x.qty+'</td><td>'+money(x.unitPrice)+'</td><td>'+x.discountPct.toFixed(1)+'%</td><td><strong>'+money(x.net)+'</strong></td></tr>'
  ).join(""):'<tr><td colspan="5">Aggiungi almeno una voce al preventivo.</td></tr>';
  $("subtotal").textContent=money(result.subtotal);
  $("discountTotal").textContent=result.discountTotal?"− "+money(result.discountTotal):money(0);
  $("taxLabel").textContent="Imposta "+result.taxRate+"%";
  $("taxTotal").textContent=money(result.tax);
  $("grandTotal").textContent=money(result.total);
  $("validityText").textContent=Math.max(1,Number($("validDays").value)||1)+" giorni dalla data del preventivo.";
}

function sample(){
  $("quoteNo").value="Q-2026-014";
  $("quoteDate").value=todayISO();
  $("clientName").value="Attività Demo";
  $("taxRate").value="22";
  $("validDays").value="30";
  lines=[
    {description:"Automazione report mensile",qty:1,unitPrice:320,discountPct:0},
    {description:"Importazione e pulizia dati CSV",qty:1,unitPrice:180,discountPct:10},
    {description:"Configurazione e test finali",qty:2,unitPrice:75,discountPct:0}
  ];
  renderEditors();renderPreview();
}
function reset(){
  $("quoteNo").value="Q-2026-001";$("quoteDate").value=todayISO();$("clientName").value="";$("taxRate").value="22";$("validDays").value="30";
  lines=[{description:"",qty:1,unitPrice:0,discountPct:0}];renderEditors();renderPreview();
}

["quoteNo","quoteDate","clientName","taxRate","validDays"].forEach(id=>$(id).addEventListener("input",renderPreview));
$("addRowBtn").addEventListener("click",()=>addLine());
$("sampleBtn").addEventListener("click",sample);
$("resetBtn").addEventListener("click",reset);
$("printBtn").addEventListener("click",()=>window.print());
$("exportBtn").addEventListener("click",()=>{
  const result=QuoteFlow.calculate(lines,$("taxRate").value);
  const blob=new Blob([QuoteFlow.toCSV(result)],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="quoteflow-preventivo.csv";a.click();URL.revokeObjectURL(url);
});
$("quoteDate").value=todayISO();
reset();
if(new URLSearchParams(location.search).get("demo")==="1") sample();
