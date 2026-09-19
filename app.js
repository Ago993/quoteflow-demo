const $=id=>document.getElementById(id);
let lines=[];
let catalog=[];
let editingCatalogId=null;

const FILE_LIMITS={quote:2*1024*1024,csv:5*1024*1024,catalog:5*1024*1024};
const CATALOG_STORAGE_KEY="quoteflow.catalog.v1";
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

function normalizeSearch(value){
  return String(value??"").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
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
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buffer);}
  catch{return new TextDecoder("windows-1252").decode(buffer);}
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

function loadCatalog(){
  try{
    const raw=localStorage.getItem(CATALOG_STORAGE_KEY);
    if(!raw) return QuoteFlow.defaultCatalog();
    if(raw.length>1_000_000) throw new Error("Catalogo locale troppo grande.");
    return QuoteFlow.normalizeCatalog(JSON.parse(raw));
  }catch{
    try{localStorage.removeItem(CATALOG_STORAGE_KEY);}catch{}
    return QuoteFlow.defaultCatalog();
  }
}

function persistCatalog(){
  catalog=QuoteFlow.normalizeCatalog(catalog);
  try{
    localStorage.setItem(CATALOG_STORAGE_KEY,JSON.stringify(catalog));
  }catch{
    showMessage("Il browser non permette di salvare il catalogo locale.","error");
  }
}

function catalogMeta(item){
  const parts=[];
  if(item.sku) parts.push(item.sku);
  parts.push(money(item.unitPrice));
  parts.push("IVA "+item.taxRate+"%");
  return parts.join(" - ");
}

function addCatalogItemToQuote(item){
  addLine({
    description:item.name,
    qty:1,
    unitPrice:item.unitPrice,
    discountPct:0,
    taxRate:item.taxRate
  });
  showMessage(item.name+" aggiunto al preventivo.","ok");
}

function renderCatalog(){
  $("catalogCount").textContent=String(catalog.length);
  const q=normalizeSearch($("catalogSearch").value);
  const filtered=catalog.filter(item=>{
    if(!q) return true;
    return normalizeSearch(item.name).includes(q)||normalizeSearch(item.sku).includes(q);
  }).slice(0,50);

  const container=$("catalogList");
  container.replaceChildren();

  if(!filtered.length){
    container.append(make("div","Nessun prodotto trovato.","catalog-empty"));
    return;
  }

  filtered.forEach(item=>{
    const card=make("div",null,"catalog-item");
    const info=make("div",null,"catalog-item-copy");
    info.append(make("strong",item.name),make("small",catalogMeta(item)));

    const actions=make("div",null,"catalog-item-actions");
    const add=make("button","Aggiungi","catalog-add");
    add.type="button";
    add.addEventListener("click",()=>addCatalogItemToQuote(item));

    const edit=make("button","Modifica","catalog-edit");
    edit.type="button";
    edit.addEventListener("click",()=>openCatalogEditor(item));

    actions.append(edit,add);
    card.append(info,actions);
    container.append(card);
  });
}

function openCatalogEditor(item=null){
  editingCatalogId=item?.id||null;
  $("catalogEditorTitle").textContent=item?"Modifica prodotto":"Nuovo prodotto";
  $("deleteCatalogBtn").classList.toggle("hidden",!item);
  $("catalogSku").value=item?.sku||"";
  $("catalogName").value=item?.name||"";
  $("catalogPrice").value=item?.unitPrice??0;
  $("catalogTax").value=item?.taxRate??22;
  $("catalogEditor").classList.remove("hidden");
  $("catalogName").focus();
}

function closeCatalogEditor(){
  editingCatalogId=null;
  $("deleteCatalogBtn").classList.add("hidden");
  $("catalogEditor").classList.add("hidden");
}

function deleteCatalogItem(){
  if(!editingCatalogId) return;
  const item=catalog.find(x=>x.id===editingCatalogId);
  if(!item) return;
  if(!window.confirm("Eliminare "+item.name+" dal catalogo?")) return;
  catalog=catalog.filter(x=>x.id!==editingCatalogId);
  persistCatalog();
  closeCatalogEditor();
  renderCatalog();
  showMessage("Prodotto eliminato dal catalogo.","ok");
}

function saveCatalogItem(){
  try{
    const id=editingCatalogId||("CAT-"+Date.now());
    const item=QuoteFlow.normalizeCatalogItem({
      id,
      sku:$("catalogSku").value,
      name:$("catalogName").value,
      unitPrice:$("catalogPrice").value,
      taxRate:$("catalogTax").value
    });
    const idx=catalog.findIndex(x=>x.id===editingCatalogId);
    if(idx>=0) catalog[idx]=item;
    else{
      if(catalog.length>=QuoteFlow.LIMITS.catalogItems) throw new Error("Limite catalogo raggiunto.");
      catalog.push(item);
    }
    persistCatalog();
    closeCatalogEditor();
    renderCatalog();
    showMessage("Catalogo aggiornato.","ok");
  }catch(err){
    showMessage(err.message,"error");
  }
}

function mergeCatalog(imported){
  const byKey=new Map();
  catalog.forEach(item=>byKey.set(normalizeSearch(item.sku||item.id),item));
  imported.forEach(item=>{
    const key=normalizeSearch(item.sku||item.id);
    byKey.set(key,item);
  });
  catalog=QuoteFlow.normalizeCatalog([...byKey.values()]);
}

async function importCatalogFile(file){
  try{
    const text=await readTextFile(file,FILE_LIMITS.catalog);
    const imported=QuoteFlow.catalogFromCSV(text);
    mergeCatalog(imported);
    persistCatalog();
    renderCatalog();
    showMessage(imported.length+" prodotti importati o aggiornati nel catalogo.","ok");
  }catch(err){
    showMessage(err.message+" Sono supportati CSV con Nome, Prezzo e IVA opzionale.","error");
  }finally{
    $("importCatalogFile").value="";
  }
}

function resetCatalog(){
  if(!window.confirm("Ripristinare il catalogo demo? Le modifiche locali al catalogo verranno sostituite.")) return;
  catalog=QuoteFlow.defaultCatalog();
  persistCatalog();
  $("catalogSearch").value="";
  closeCatalogEditor();
  renderCatalog();
  showMessage("Catalogo demo ripristinato.","ok");
}

function manualDefaultTax(){
  const n=Number($("taxRate").value);
  return Number.isFinite(n)?n:22;
}

function addLine(data=null){
  if(lines.length>=QuoteFlow.LIMITS.quoteLines){
    showMessage("Limite massimo di voci raggiunto.","error");
    return;
  }
  const next=data||{description:"",qty:1,unitPrice:0,discountPct:0,taxRate:manualDefaultTax()};
  lines.push({...next});
  renderEditors();
  renderPreview();
}

function removeLine(i){
  if(lines.length===1){
    lines=[{description:"",qty:1,unitPrice:0,discountPct:0,taxRate:manualDefaultTax()}];
  }else lines.splice(i,1);
  renderEditors();
  renderPreview();
}

function updateLine(i,key,value){
  lines[i][key]=value;
  renderPreview();
}

function buildField(labelText,input){
  const label=make("label");
  label.append(make("span",labelText),input);
  return label;
}

function numberInput(value,min,max,step,key,i){
  const input=document.createElement("input");
  input.type="number";
  input.min=String(min);
  if(max!==null) input.max=String(max);
  input.step=String(step);
  input.value=String(value);
  input.dataset.i=i;
  input.dataset.k=key;
  return input;
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
    desc.dataset.i=i;
    desc.dataset.k="description";

    const qty=numberInput(x.qty,0,null,0.01,"qty",i);
    const price=numberInput(x.unitPrice,0,null,0.01,"unitPrice",i);
    const discount=numberInput(x.discountPct,0,100,0.01,"discountPct",i);
    const tax=numberInput(x.taxRate==null?manualDefaultTax():x.taxRate,0,100,0.01,"taxRate",i);

    const remove=make("button","x","remove");
    remove.type="button";
    remove.title="Rimuovi voce";
    remove.setAttribute("aria-label","Rimuovi voce");
    remove.addEventListener("click",()=>removeLine(i));

    [desc,qty,price,discount,tax].forEach(input=>{
      input.addEventListener("input",e=>updateLine(i,e.target.dataset.k,e.target.value));
    });

    row.append(
      buildField("Descrizione",desc),
      buildField("Q.ta",qty),
      buildField("Prezzo EUR",price),
      buildField("Sconto %",discount),
      buildField("IVA %",tax),
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

function renderTaxBreakdown(result){
  const box=$("taxBreakdown");
  box.replaceChildren();
  if(result.taxBreakdown.length<=1){
    box.classList.add("hidden");
    $("taxLabel").textContent=result.taxBreakdown.length===1?"IVA "+result.taxBreakdown[0].rate+"%":"IVA";
    return;
  }
  $("taxLabel").textContent="IVA totale";
  box.classList.remove("hidden");
  result.taxBreakdown.forEach(x=>{
    const row=make("div",null,"tax-breakdown-row");
    row.append(make("span","IVA "+x.rate+"%"),make("strong",money(x.amount)));
    box.append(row);
  });
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
    td.colSpan=6;
    tr.append(td);
    tbody.append(tr);
  }else{
    result.items.forEach(x=>{
      const tr=document.createElement("tr");
      appendCell(tr,x.description||"Voce");
      appendCell(tr,x.qty);
      appendCell(tr,money(x.unitPrice));
      appendCell(tr,x.discountPct.toFixed(1)+"%");
      appendCell(tr,x.taxRate.toFixed(1)+"%");
      appendCell(tr,money(x.net),true);
      tbody.append(tr);
    });
  }

  $("subtotal").textContent=money(result.subtotal);
  $("discountTotal").textContent=result.discountTotal?"- "+money(result.discountTotal):money(0);
  $("taxTotal").textContent=money(result.tax);
  renderTaxBreakdown(result);
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
    {description:"Automazione report mensile",qty:1,unitPrice:320,discountPct:0,taxRate:22},
    {description:"Importazione e pulizia dati CSV",qty:1,unitPrice:180,discountPct:10,taxRate:22},
    {description:"Configurazione e test finali",qty:2,unitPrice:75,discountPct:0,taxRate:22}
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
  lines=[{description:"",qty:1,unitPrice:0,discountPct:0,taxRate:22}];
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
    const defaultTax=manualDefaultTax();
    const imported=QuoteFlow.linesFromCSV(text).map(x=>({
      ...x,
      taxRate:x.taxRate==null?defaultTax:x.taxRate
    }));
    lines=imported;
    renderEditors();
    renderPreview();
    showMessage(imported.length+" voci importate dal CSV.","ok");
  }catch(err){
    showMessage(err.message+" Sono supportati CSV separati da virgola, punto e virgola o tab.","error");
  }finally{$("importCsvFile").value="";}
}

["quoteNo","quoteDate","clientName","clientEmail","validDays"].forEach(id=>$(id).addEventListener("input",renderPreview));
$("taxRate").addEventListener("input",()=>{});
$("addRowBtn").addEventListener("click",()=>addLine());
$("sampleBtn").addEventListener("click",sample);
$("resetBtn").addEventListener("click",reset);
$("saveQuoteBtn").addEventListener("click",saveQuote);
$("openQuoteBtn").addEventListener("click",()=>$( "openQuoteFile").click());
$("importCsvBtn").addEventListener("click",()=>$( "importCsvFile").click());
$("openQuoteFile").addEventListener("change",e=>{const f=e.target.files[0];if(f) openQuoteFile(f);});
$("importCsvFile").addEventListener("change",e=>{const f=e.target.files[0];if(f) importCsvFile(f);});
$("printBtn").addEventListener("click",()=>window.print());
$("exportBtn").addEventListener("click",()=>{
  try{
    const result=QuoteFlow.calculate(lines,$("taxRate").value);
    downloadText("\uFEFF"+QuoteFlow.toCSV(result),safeFilename($("quoteNo").value)+"-righe.csv","text/csv;charset=utf-8");
    showMessage("CSV esportato. Puoi reimportarlo con 'Importa righe CSV'.","ok");
  }catch(err){showMessage(err.message,"error");}
});

$("catalogSearch").addEventListener("input",renderCatalog);
$("newCatalogBtn").addEventListener("click",()=>openCatalogEditor());
$("cancelCatalogBtn").addEventListener("click",closeCatalogEditor);
$("saveCatalogBtn").addEventListener("click",saveCatalogItem);
$("deleteCatalogBtn").addEventListener("click",deleteCatalogItem);
$("importCatalogBtn").addEventListener("click",()=>$( "importCatalogFile").click());
$("importCatalogFile").addEventListener("change",e=>{const f=e.target.files[0];if(f) importCatalogFile(f);});
$("exportCatalogBtn").addEventListener("click",()=>{
  try{
    downloadText("\uFEFF"+QuoteFlow.catalogCSV(catalog),"quoteflow-catalogo.csv","text/csv;charset=utf-8");
    showMessage("Catalogo esportato in CSV.","ok");
  }catch(err){showMessage(err.message,"error");}
});
$("resetCatalogBtn").addEventListener("click",resetCatalog);

catalog=loadCatalog();
renderCatalog();
reset();
if(new URLSearchParams(location.search).get("demo")==="1") sample();
