const $=id=>document.getElementById(id);
let lines=[];

const money=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(v||0);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function todayISO(){
  const d=new Date(),off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}

function showMessage(message,type="ok"){
  const box=$("messageBox");
  box.textContent=message;
  box.className="message-box "+type;
}
function clearMessage(){
  const box=$("messageBox");
  box.textContent="";
  box.className="message-box hidden";
}

async function readTextFile(file){
  const buffer=await file.arrayBuffer();
  try{
    return new TextDecoder("utf-8",{fatal:true}).decode(buffer);
  }catch{
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function currentState(){
  return {
    quoteNo:$("quoteNo").value,
    date:$("quoteDate").value,
    clientName:$("clientName").value,
    clientEmail:$("clientEmail").value,
    taxRate:$("taxRate").value,
    validDays:$("validDays").value,
    lines
  };
}

function applyState(state){
  const q=QuoteFlow.normalizeQuoteState(state);
  $("quoteNo").value=q.quoteNo;
  $("quoteDate").value=q.date||todayISO();
  $("clientName").value=q.clientName;
  $("clientEmail").value=q.clientEmail;
  $("taxRate").value=q.taxRate;
  $("validDays").value=q.validDays;
  lines=q.lines.map(x=>({...x}));
  renderEditors();
  renderPreview();
}

function addLine(data={description:"",qty:1,unitPrice:0,discountPct:0}){
  lines.push({...data});
  renderEditors();
  renderPreview();
}
function removeLine(i){
  if(lines.length===1) lines=[{description:"",qty:1,unitPrice:0,discountPct:0}];
  else lines.splice(i,1);
  renderEditors();
  renderPreview();
}
function updateLine(i,key,value){
  lines[i][key]=value;
  renderPreview();
}

function renderEditors(){
  $("lineEditors").innerHTML=lines.map((x,i)=>
    '<div class="line-editor"><div class="row">'+
    '<label>Descrizione<input data-i="'+i+'" data-k="description" value="'+esc(x.description)+'" placeholder="Servizio o prodotto"></label>'+
    '<label>Q.ta<input type="number" min="0" step="0.01" data-i="'+i+'" data-k="qty" value="'+x.qty+'"></label>'+
    '<label>Prezzo EUR<input type="number" min="0" step="0.01" data-i="'+i+'" data-k="unitPrice" value="'+x.unitPrice+'"></label>'+
    '<label>Sconto %<input type="number" min="0" max="100" step="0.01" data-i="'+i+'" data-k="discountPct" value="'+x.discountPct+'"></label>'+
    '<button class="remove" data-remove="'+i+'" title="Rimuovi voce" aria-label="Rimuovi voce">x</button></div></div>'
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
  $("previewEmail").textContent=$("clientEmail").value||"";
  $("previewRows").innerHTML=result.items.length?result.items.map(x=>
    '<tr><td>'+esc(x.description||"Voce")+'</td><td>'+x.qty+'</td><td>'+money(x.unitPrice)+'</td><td>'+x.discountPct.toFixed(1)+'%</td><td><strong>'+money(x.net)+'</strong></td></tr>'
  ).join(""):'<tr><td colspan="5">Aggiungi almeno una voce al preventivo.</td></tr>';
  $("subtotal").textContent=money(result.subtotal);
  $("discountTotal").textContent=result.discountTotal?"- "+money(result.discountTotal):money(0);
  $("taxLabel").textContent="Imposta "+result.taxRate+"%";
  $("taxTotal").textContent=money(result.tax);
  $("grandTotal").textContent=money(result.total);
  $("validityText").textContent=Math.max(1,Number($("validDays").value)||1)+" giorni dalla data del preventivo.";
}

function sample(){
  $("quoteNo").value="Q-2026-014";
  $("quoteDate").value=todayISO();
  $("clientName").value="Attivita Demo";
  $("clientEmail").value="cliente@example.com";
  $("taxRate").value="22";
  $("validDays").value="30";
  lines=[
    {description:"Automazione report mensile",qty:1,unitPrice:320,discountPct:0},
    {description:"Importazione e pulizia dati CSV",qty:1,unitPrice:180,discountPct:10},
    {description:"Configurazione e test finali",qty:2,unitPrice:75,discountPct:0}
  ];
  clearMessage();
  renderEditors();
  renderPreview();
}

function reset(){
  $("quoteNo").value="Q-2026-001";
  $("quoteDate").value=todayISO();
  $("clientName").value="";
  $("clientEmail").value="";
  $("taxRate").value="22";
  $("validDays").value="30";
  lines=[{description:"",qty:1,unitPrice:0,discountPct:0}];
  clearMessage();
  renderEditors();
  renderPreview();
}

function safeFilename(value){
  return String(value||"preventivo").trim().replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"preventivo";
}

function downloadText(text,name,type){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;
  a.download=name;
  a.click();
  URL.revokeObjectURL(url);
}

function saveQuote(){
  try{
    const text=QuoteFlow.serializeQuote(currentState());
    downloadText(text,safeFilename($("quoteNo").value)+".quoteflow.json","application/json;charset=utf-8");
    showMessage("Preventivo salvato. Potrai riaprirlo e continuare a modificarlo.","ok");
  }catch(err){
    showMessage(err.message,"error");
  }
}

async function openQuoteFile(file){
  try{
    const text=await readTextFile(file);
    const state=QuoteFlow.parseQuote(text);
    applyState(state);
    showMessage("Preventivo aperto correttamente: "+state.lines.length+" voci caricate.","ok");
  }catch(err){
    showMessage(err.message,"error");
  }finally{
    $("openQuoteFile").value="";
  }
}

async function importCsvFile(file){
  try{
    const text=await readTextFile(file);
    const imported=QuoteFlow.linesFromCSV(text);
    lines=imported.map(x=>({...x}));
    renderEditors();
    renderPreview();
    showMessage(imported.length+" voci importate dal CSV.","ok");
  }catch(err){
    showMessage(err.message+" Sono supportati CSV separati da virgola, punto e virgola o tab.","error");
  }finally{
    $("importCsvFile").value="";
  }
}

["quoteNo","quoteDate","clientName","clientEmail","taxRate","validDays"].forEach(id=>$(id).addEventListener("input",renderPreview));
$("addRowBtn").addEventListener("click",()=>addLine());
$("sampleBtn").addEventListener("click",sample);
$("resetBtn").addEventListener("click",reset);
$("saveQuoteBtn").addEventListener("click",saveQuote);
$("openQuoteBtn").addEventListener("click",()=>$("openQuoteFile").click());
$("importCsvBtn").addEventListener("click",()=>$("importCsvFile").click());
$("openQuoteFile").addEventListener("change",e=>{const f=e.target.files[0];if(f) openQuoteFile(f);});
$("importCsvFile").addEventListener("change",e=>{const f=e.target.files[0];if(f) importCsvFile(f);});
$("printBtn").addEventListener("click",()=>window.print());
$("exportBtn").addEventListener("click",()=>{
  try{
    const result=QuoteFlow.calculate(lines,$("taxRate").value);
    downloadText("\uFEFF"+QuoteFlow.toCSV(result),safeFilename($("quoteNo").value)+"-righe.csv","text/csv;charset=utf-8");
    showMessage("CSV esportato. Puoi reimportarlo con 'Importa CSV'.","ok");
  }catch(err){
    showMessage(err.message,"error");
  }
});

reset();
if(new URLSearchParams(location.search).get("demo")==="1") sample();
