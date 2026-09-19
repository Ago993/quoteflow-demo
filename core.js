(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.QuoteFlow=api;
})(typeof self!=="undefined"?self:this,function(){
  const LIMITS={
    csvChars:5_000_000,
    csvRows:10_000,
    csvColumns:100,
    fieldChars:10_000,
    quoteChars:2_000_000,
    quoteLines:500,
    descriptionChars:1_000,
    catalogItems:1_000,
    catalogNameChars:250,
    catalogSkuChars:100
  };

  const DEFAULT_CATALOG=[
    {id:"CONS-001",sku:"CONS-001",name:"Consulenza tecnica",unitPrice:80,taxRate:22},
    {id:"AUTO-001",sku:"AUTO-001",name:"Automazione report mensile",unitPrice:320,taxRate:22},
    {id:"DATA-001",sku:"DATA-001",name:"Importazione e pulizia dati CSV",unitPrice:180,taxRate:22},
    {id:"SETUP-001",sku:"SETUP-001",name:"Configurazione e test finali",unitPrice:75,taxRate:22},
    {id:"WEB-001",sku:"WEB-001",name:"Landing page professionale",unitPrice:450,taxRate:22},
    {id:"MAINT-001",sku:"MAINT-001",name:"Manutenzione mensile",unitPrice:120,taxRate:22},
    {id:"TRAIN-001",sku:"TRAIN-001",name:"Formazione operativa 2h",unitPrice:150,taxRate:22},
    {id:"CUSTOM-001",sku:"CUSTOM-001",name:"Sviluppo funzionalita personalizzata",unitPrice:250,taxRate:22}
  ];

  function boundedString(value,max,label){
    const s=String(value??"");
    if(s.length>max) throw new Error(label+" troppo lungo.");
    return s;
  }

  function parseNumber(value){
    let s=String(value??"").trim().replace(/[€$£\s]/g,"");
    if(!s) return NaN;
    const comma=s.lastIndexOf(","),dot=s.lastIndexOf(".");
    if(comma>=0&&dot>=0){
      if(comma>dot) s=s.replace(/\./g,"").replace(",",".");
      else s=s.replace(/,/g,"");
    }else if(comma>=0) s=s.replace(",",".");
    const n=Number(s);
    return Number.isFinite(n)?n:NaN;
  }

  function num(v,def=0){
    const n=parseNumber(v);
    return Number.isFinite(n)?n:def;
  }

  function moneyRound(v){
    return Math.round((v+Number.EPSILON)*100)/100;
  }

  function normalizeTaxRate(v,fallback=null){
    if(v===undefined||v===null||String(v).trim()==="") return fallback;
    return Math.min(100,Math.max(0,num(v,0)));
  }

  function normalizeLine(line){
    return {
      description:boundedString(line?.description??"",LIMITS.descriptionChars,"Descrizione").trim(),
      qty:Math.max(0,num(line?.qty,0)),
      unitPrice:Math.max(0,num(line?.unitPrice,0)),
      discountPct:Math.min(100,Math.max(0,num(line?.discountPct,0))),
      taxRate:normalizeTaxRate(line?.taxRate,null)
    };
  }

  function calculate(lines,defaultTaxRate){
    const defaultRate=Math.min(100,Math.max(0,num(defaultTaxRate,0)));
    const normalized=(lines||[]).map(normalizeLine).filter(x=>x.description||x.qty||x.unitPrice);
    if(normalized.length>LIMITS.quoteLines) throw new Error("Troppe voci nel preventivo.");
    let gross=0,discountTotal=0,tax=0;
    const breakdownMap=new Map();

    const items=normalized.map(x=>{
      const lineGross=moneyRound(x.qty*x.unitPrice);
      const discount=moneyRound(lineGross*x.discountPct/100);
      const net=moneyRound(lineGross-discount);
      const effectiveTaxRate=x.taxRate==null?defaultRate:x.taxRate;
      const lineTax=moneyRound(net*effectiveTaxRate/100);
      gross=moneyRound(gross+lineGross);
      discountTotal=moneyRound(discountTotal+discount);
      tax=moneyRound(tax+lineTax);
      breakdownMap.set(effectiveTaxRate,moneyRound((breakdownMap.get(effectiveTaxRate)||0)+lineTax));
      return {...x,taxRate:effectiveTaxRate,lineGross,discount,net,tax:lineTax};
    });

    const subtotal=moneyRound(gross-discountTotal);
    const total=moneyRound(subtotal+tax);
    const taxBreakdown=[...breakdownMap.entries()]
      .map(([rate,amount])=>({rate:Number(rate),amount}))
      .sort((a,b)=>a.rate-b.rate);
    return {items,gross,discountTotal,subtotal,taxRate:defaultRate,tax,total,taxBreakdown};
  }

  function protectSpreadsheetText(value){
    const s=String(value??"");
    return /^\s*[=+\-@]/.test(s)?"'"+s:s;
  }

  function unprotectSpreadsheetText(value){
    const s=String(value??"");
    return /^'\s*[=+\-@]/.test(s)?s.slice(1):s;
  }

  function escapeCsv(v){
    const s=String(v??"");
    return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
  }

  function toCSV(result){
    const head=["Descrizione","Quantita","Prezzo unitario","Sconto %","IVA %","Totale riga"];
    const rows=result.items.map(x=>[
      protectSpreadsheetText(x.description),
      x.qty,
      x.unitPrice.toFixed(2),
      x.discountPct.toFixed(2),
      x.taxRate.toFixed(2),
      x.net.toFixed(2)
    ]);
    rows.push(["Subtotale","","","","",result.subtotal.toFixed(2)]);
    rows.push(["IVA totale","","","","",result.tax.toFixed(2)]);
    rows.push(["Totale","","","","",result.total.toFixed(2)]);
    return [head,...rows].map(r=>r.map(escapeCsv).join(",")).join("\n");
  }

  function norm(v){
    return String(v??"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function detectDelimiter(text){
    const line=String(text).replace(/^\uFEFF/,"").split(/\r?\n/).find(x=>x.trim())||"";
    const counts={",":0,";":0,"\t":0};
    let quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"') quoted=!quoted;
      else if(!quoted&&Object.prototype.hasOwnProperty.call(counts,ch)) counts[ch]++;
    }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  }

  function parseCSV(text){
    const s=String(text).replace(/^\uFEFF/,"");
    if(s.length>LIMITS.csvChars) throw new Error("CSV troppo grande.");
    const rows=[];let row=[];let field="";let quoted=false;
    const delimiter=detectDelimiter(s);
    function pushField(){
      if(field.length>LIMITS.fieldChars) throw new Error("Campo CSV troppo lungo.");
      row.push(field);field="";
      if(row.length>LIMITS.csvColumns) throw new Error("Troppe colonne nel CSV.");
    }
    function pushRow(){
      if(row.some(v=>String(v).trim()!=="")) rows.push(row);
      row=[];
      if(rows.length>LIMITS.csvRows+1) throw new Error("Troppe righe nel CSV.");
    }
    for(let i=0;i<s.length;i++){
      const ch=s[i],next=s[i+1];
      if(ch==='"'){
        if(quoted&&next==='"'){field+='"';i++;}
        else quoted=!quoted;
      }else if(ch===delimiter&&!quoted){pushField();}
      else if((ch==="\n"||ch==="\r")&&!quoted){
        if(ch==="\r"&&next==="\n") i++;
        pushField();pushRow();
      }else{
        field+=ch;
        if(field.length>LIMITS.fieldChars) throw new Error("Campo CSV troppo lungo.");
      }
    }
    pushField();pushRow();
    if(rows.length<2) throw new Error("Il CSV non contiene righe dati.");
    const headers=rows[0].map(h=>String(h).trim());
    return rows.slice(1).map(r=>{
      const obj={};
      headers.forEach((h,i)=>obj[h]=String(r[i]??"").trim());
      return obj;
    });
  }

  function detectColumn(headers,candidates){
    const normalized=headers.map(norm);
    for(const c of candidates){
      const idx=normalized.indexOf(norm(c));
      if(idx>=0) return headers[idx];
    }
    return null;
  }

  function linesFromCSV(text){
    const rows=parseCSV(text);
    const headers=Object.keys(rows[0]||{});
    const description=detectColumn(headers,["descrizione","description","voce","articolo","prodotto","servizio"]);
    const qty=detectColumn(headers,["quantita","qta","qty","quantity"]);
    const unitPrice=detectColumn(headers,["prezzo unitario","prezzo","unit price","price","costo"]);
    const discountPct=detectColumn(headers,["sconto %","sconto","discount %","discount"]);
    const taxRate=detectColumn(headers,["iva %","iva","tax %","tax","aliquota","aliquota iva"]);
    if(!description||!qty||!unitPrice){
      throw new Error("Il CSV deve contenere almeno Descrizione, Quantita e Prezzo unitario.");
    }
    const ignored=/^(subtotale|totale|iva totale|imposta(?:\s|$))/i;
    const lines=rows
      .filter(r=>!ignored.test(String(r[description]||"").trim()))
      .map(r=>normalizeLine({
        description:unprotectSpreadsheetText(r[description]),
        qty:r[qty],
        unitPrice:r[unitPrice],
        discountPct:discountPct?r[discountPct]:0,
        taxRate:taxRate?r[taxRate]:null
      }))
      .filter(x=>x.description);
    if(!lines.length) throw new Error("Il CSV non contiene voci importabili.");
    if(lines.length>LIMITS.quoteLines) throw new Error("Troppe voci nel CSV.");
    return lines;
  }

  function normalizeQuoteState(input){
    const q=input?.quote&&typeof input.quote==="object"?input.quote:input;
    if(!q||typeof q!=="object"||Array.isArray(q)) throw new Error("Struttura preventivo non valida.");
    if(!Array.isArray(q.lines)) throw new Error("Elenco voci non valido.");
    if(q.lines.length>LIMITS.quoteLines) throw new Error("Troppe voci nel preventivo.");
    const lines=q.lines.map(normalizeLine).filter(x=>x.description||x.qty||x.unitPrice);
    if(!lines.length) throw new Error("Il preventivo non contiene voci valide.");
    return {
      quoteNo:boundedString(q.quoteNo??"",100,"Numero preventivo").trim()||"Q-2026-001",
      date:boundedString(q.date??"",32,"Data").trim(),
      clientName:boundedString(q.clientName??"",250,"Cliente").trim(),
      clientEmail:boundedString(q.clientEmail??"",320,"Email").trim(),
      taxRate:Math.min(100,Math.max(0,num(q.taxRate,22))),
      validDays:Math.max(1,Math.round(num(q.validDays,30))),
      lines
    };
  }

  function serializeQuote(state){
    const quote=normalizeQuoteState(state);
    return JSON.stringify({format:"quoteflow",version:1,savedAt:new Date().toISOString(),quote},null,2);
  }

  function parseQuote(text){
    const source=String(text);
    if(source.length>LIMITS.quoteChars) throw new Error("File preventivo troppo grande.");
    let parsed;
    try{parsed=JSON.parse(source);}
    catch{throw new Error("File preventivo non valido: JSON non leggibile.");}
    if(parsed?.format!=="quoteflow") throw new Error("Questo file non e un preventivo QuoteFlow.");
    if(parsed?.version!==1) throw new Error("Versione del file QuoteFlow non supportata.");
    return normalizeQuoteState(parsed);
  }

  function normalizeCatalogItem(item,index=0){
    if(!item||typeof item!=="object"||Array.isArray(item)) throw new Error("Prodotto catalogo non valido.");
    const sku=boundedString(item.sku??"",LIMITS.catalogSkuChars,"Codice prodotto").trim();
    const name=boundedString(item.name??"",LIMITS.catalogNameChars,"Nome prodotto").trim();
    if(!name) throw new Error("Il prodotto deve avere un nome.");
    const unitPrice=Math.max(0,num(item.unitPrice,0));
    const taxRate=Math.min(100,Math.max(0,num(item.taxRate,22)));
    const id=boundedString(item.id??sku??"",120,"ID prodotto").trim()||("catalog-"+index);
    return {id,sku,name,unitPrice,taxRate};
  }

  function normalizeCatalog(items){
    if(!Array.isArray(items)) throw new Error("Catalogo non valido.");
    if(items.length>LIMITS.catalogItems) throw new Error("Troppi prodotti nel catalogo.");
    return items.map((x,i)=>normalizeCatalogItem(x,i));
  }

  function defaultCatalog(){
    return DEFAULT_CATALOG.map(x=>({...x}));
  }

  function catalogCSV(items){
    const normalized=normalizeCatalog(items);
    const head=["Codice","Nome","Prezzo","IVA %"];
    const rows=normalized.map(x=>[
      protectSpreadsheetText(x.sku),
      protectSpreadsheetText(x.name),
      x.unitPrice.toFixed(2),
      x.taxRate.toFixed(2)
    ]);
    return [head,...rows].map(r=>r.map(escapeCsv).join(",")).join("\n");
  }

  function catalogFromCSV(text){
    const rows=parseCSV(text);
    const headers=Object.keys(rows[0]||{});
    const sku=detectColumn(headers,["codice","sku","id","codice prodotto"]);
    const name=detectColumn(headers,["nome","prodotto","servizio","descrizione","name"]);
    const unitPrice=detectColumn(headers,["prezzo","prezzo unitario","price","unit price","costo"]);
    const taxRate=detectColumn(headers,["iva %","iva","tax %","tax","aliquota","aliquota iva"]);
    if(!name||!unitPrice) throw new Error("Il catalogo CSV deve contenere almeno Nome e Prezzo.");
    const items=rows.map((r,i)=>normalizeCatalogItem({
      id:sku?unprotectSpreadsheetText(r[sku]):("import-"+i),
      sku:sku?unprotectSpreadsheetText(r[sku]):"",
      name:unprotectSpreadsheetText(r[name]),
      unitPrice:r[unitPrice],
      taxRate:taxRate?r[taxRate]:22
    },i)).filter(x=>x.name);
    if(items.length>LIMITS.catalogItems) throw new Error("Troppi prodotti nel catalogo.");
    return items;
  }

  return {
    LIMITS,DEFAULT_CATALOG,normalizeLine,calculate,toCSV,parseCSV,linesFromCSV,
    normalizeQuoteState,serializeQuote,parseQuote,protectSpreadsheetText,unprotectSpreadsheetText,
    normalizeCatalogItem,normalizeCatalog,defaultCatalog,catalogCSV,catalogFromCSV
  };
});