const $=id=>document.getElementById(id);
let lines=[];
const FILE_LIMITS={quote:2*1024*1024,csv:5*1024*1024};

const money=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(v||0);

function todayISO(){
  const d=new Date(),off=d.getTimezoneOffset();
  return new Date(d.getTime()-off*60000).toISOString().slice(0,10);
}

function make(tag,text,className){
  const el=document.createElement(tag);
  if(text!==undefined&&text!==null) el.textContent=String(text);
  if(className) el.className=className;
  return el;
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

async function readTextFile(file,maxBytes){
  if(file.size>maxBytes) throw new Error("File troppo grande.");
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
  if(lines.length>=QuoteFlow.LIMITS.quoteLines){
    showMessage("Limite massimo di voci raggiunto.","error");
    return;
  }
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

function buildField(labelText,input){
  const label=make("label",null);
  label.append(make("span",labelText),input);
  return label;
}

function renderEditors(){
  const container=$("lineEditors");
  container.replaceChildren();
  lines.forEach((x,i)=>{
    const wrapper=make("div",null,"line-editor");
    const row=make("div",null,"row");

    const desc=document.createElement("input");
    desc.value=x.description;
    desc.placeholder="Servizio o prodotto";
    desc.maxLength=QuoteFlow.LIMITS.descriptionChars;
    desc.dataset.i=i;desc.dataset.k="description";

    const qty=document.createElement("input");
    qty.type="number";qty.min="0";qty.step="0.01";qty.value=x.qty;
    qty.dataset.i=i;qty.dataset.k="qty";

    const price=document.createElement("input");
    price.type="number";price.min="0";price.step="0.01";price.value=x.unitPrice;
    price.dataset.i=i;price.dataset.k="unitPrice";

    const discount=document.createElement("input");
    discount.type="number";discount.min="0";discount.max="100";discount.step="0.01";discount.value=x.discountPct;
    discount.dataset.i=i;discount.dataset.k="discountPct";

    const remove=make("button","x","remove");
    remove.type="button";remove.title="Rimuovi voce";remove.setAttribute("aria-label","Rimuovi voce");
    remove.addEventListener("click",()=>removeLine(i));

    [desc,qty,price,discount].forEach(input=>input.addEventListener("input",e=>updateLine(i,e.target.dataset.k,e.target.value)));
    row.append(
      buildField("Descrizione",desc),
      buildField("Q.ta",qty),
      buildField("Prezzo EUR",price),
      buildField("Sconto %",discount),
      remove
    );
    wrapper.append(row);
    container.append(wrapper);
  });
}

function appendCell(row,text,strong=false){
  const td=document.createElement("td");
  if(strong) td.append(make("strong",text));
  else td.textContent=String(text);
  row.append(td);
}

function renderPreview(){
  const result=QuoteFlow.calculate(lines,$("taxRate").value);
  $("previewNo").textContent=$("quoteNo").value||"Preventivo";
  const d=$("quoteDate").value;
  $("previewDate").textContent=d?new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(d+"T12:00:00")):"";
  $("previewClient").textContent=$("clientName").value||"Cliente";
  $("previewEmail").textContent=$("clientEmail").value||"";

  const tbody=$("previewRows");
  tbody.replaceChildren();
  if(!result.items.length){
    const tr=document.createElement("tr");
    const td=make("td","Aggiungi almeno una voce al preventivo.");
    td.colSpan=5;tr.append(td);tbody.append(tr);
  }else{
    result.items.forEach(x=>{
      const tr=document.createElement("tr");
      appendCell(tr,x.description||"Voce");
      appendCell(tr,x.qty);
      appendCell(tr,money(x.unitPrice));
      appendCell(tr,x.discountPct.toFixed(1)+"%");
      appendCell(tr,money(x.net),true);
      tbody.append(tr);
    });
  }

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
  clearMessage();renderEditors();renderPreview();
}

function reset(){
  $("quoteNo").value="Q-2026-001";
  $("quoteDate").value=todayISO();
  $("clientName").value="";
  $("clientEmail").value="";
  $("taxRate").value="22";
  $("validDays").value="30";
  lines=[{description:"",qty:1,unitPrice:0,discountPct:0}];
  clearMessage();renderEditors();renderPreview();
}

function safeFilename(value){
  return String(value||"preventivo").trim().replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"preventivo";
}

function downloadText(text,name,type){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}

function saveQuote(){
  try{
    const text=QuoteFlow.serializeQuote(currentState());
    downloadText(text,safeFilename($("quoteNo").value)+".qflow","application/vnd.quoteflow+json;charset=utf-8");
    showMessage("Preventivo salvato. Potrai riaprirlo e continuare a modificarlo.","ok");
  }catch(err){showMessage(err.message,"error");}
}

async function openQuoteFile(file){
  try{
    const text=await readTextFile(file,FILE_LIMITS.quote);
    const state=QuoteFlow.parseQuote(text);
    applyState(state);
    showMessage("Preventivo aperto correttamente: "+state.lines.length+" voci caricate.","ok");
  }catch(err){showMessage(err.message,"error");}
  finally{$("openQuoteFile").value="";}
}

async function importCsvFile(file){
  try{
    const text=await readTextFile(file,FILE_LIMITS.csv);
    const imported=QuoteFlow.linesFromCSV(text);
    lines=imported.map(x=>({...x}));
    renderEditors();renderPreview();
    showMessage(imported.length+" voci importate dal CSV.","ok");
  }catch(err){
    showMessage(err.message+" Sono supportati CSV separati da virgola, punto e virgola o tab.","error");
  }finally{$("importCsvFile").value="";}
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
  }catch(err){showMessage(err.message,"error");}
});

reset();
if(new URLSearchParams(location.search).get("demo")==="1") sample();
