const assert=require("assert");
const fs=require("fs");
const path=require("path");
const core=require("../core.js");

const result=core.calculate([
  {description:"Servizio A",qty:2,unitPrice:100,discountPct:10},
  {description:"Servizio B",qty:1,unitPrice:50,discountPct:0}
],22);

assert.equal(result.items.length,2);
assert.equal(result.gross,250);
assert.equal(result.discountTotal,20);
assert.equal(result.subtotal,230);
assert.equal(result.tax,50.6);
assert.equal(result.total,280.6);
assert.equal(result.taxBreakdown.length,1);
assert.equal(result.taxBreakdown[0].rate,22);

const mixed=core.calculate([
  {description:"A",qty:1,unitPrice:100,discountPct:0,taxRate:22},
  {description:"B",qty:1,unitPrice:100,discountPct:0,taxRate:10}
],22);
assert.equal(mixed.subtotal,200);
assert.equal(mixed.tax,32);
assert.equal(mixed.total,232);
assert.deepEqual(mixed.taxBreakdown,[{rate:10,amount:10},{rate:22,amount:22}]);

const bounded=core.calculate([{description:"X",qty:-1,unitPrice:-10,discountPct:150,taxRate:150}],0);
assert.equal(bounded.items[0].qty,0);
assert.equal(bounded.items[0].unitPrice,0);
assert.equal(bounded.items[0].discountPct,100);
assert.equal(bounded.items[0].taxRate,100);
assert.equal(bounded.total,0);

const decimal=core.calculate([{description:"Y",qty:"2,5",unitPrice:"10,40",discountPct:"5",taxRate:"10"}],"22");
assert.equal(decimal.subtotal,24.7);
assert.equal(decimal.tax,2.47);
assert.equal(decimal.total,27.17);

const csv=core.toCSV(result);
assert.ok(csv.includes("Descrizione"));
assert.ok(csv.includes("IVA %"));
assert.ok(csv.includes("Servizio A"));
assert.ok(csv.includes("Totale"));

const reimported=core.linesFromCSV(csv);
assert.equal(reimported.length,2);
assert.equal(reimported[0].description,"Servizio A");
assert.equal(reimported[0].qty,2);
assert.equal(reimported[0].unitPrice,100);
assert.equal(reimported[0].discountPct,10);
assert.equal(reimported[0].taxRate,22);

const italianCsv='Descrizione;Quantita;Prezzo unitario;Sconto %;IVA %\n"Analisi dati";2;125,50;5;22\n"Setup";1;80,00;0;10\n';
const italianLines=core.linesFromCSV(italianCsv);
assert.equal(italianLines.length,2);
assert.equal(italianLines[0].unitPrice,125.5);
assert.equal(italianLines[0].discountPct,5);
assert.equal(italianLines[1].taxRate,10);

const state={
  quoteNo:"Q-2026-099",
  date:"2026-09-19",
  clientName:"Cliente Test",
  clientEmail:"cliente@example.com",
  taxRate:22,
  validDays:45,
  lines:[
    {description:"Servizio A",qty:2,unitPrice:100,discountPct:10,taxRate:22},
    {description:"Servizio B",qty:1,unitPrice:50,discountPct:0,taxRate:10}
  ]
};

const saved=core.serializeQuote(state);
const reopened=core.parseQuote(saved);
assert.deepEqual(reopened,core.normalizeQuoteState(state));
assert.equal(core.calculate(reopened.lines,reopened.taxRate).total,274.6);

const legacySaved=JSON.stringify({
  format:"quoteflow",
  version:1,
  quote:{
    quoteNo:"LEGACY-1",
    date:"2026-09-19",
    clientName:"Legacy",
    clientEmail:"",
    taxRate:22,
    validDays:30,
    lines:[{description:"Vecchia voce",qty:1,unitPrice:100,discountPct:0}]
  }
});
const legacy=core.parseQuote(legacySaved);
assert.equal(legacy.lines[0].taxRate,null);
assert.equal(core.calculate(legacy.lines,legacy.taxRate).total,122);

let invalidRejected=false;
try{core.parseQuote('{"format":"other","version":1,"quote":{}}');}
catch(err){invalidRejected=/non e un preventivo QuoteFlow/.test(err.message);}
assert.equal(invalidRejected,true);

const defaults=core.defaultCatalog();
assert.equal(defaults.length,8);
assert.equal(defaults[0].taxRate,22);
const copy=core.defaultCatalog();
copy[0].name="Modificato";
assert.notEqual(core.defaultCatalog()[0].name,"Modificato");

const catalogCsv=core.catalogCSV(defaults);
assert.ok(catalogCsv.includes("IVA %"));
const catalogRoundtrip=core.catalogFromCSV(catalogCsv);
assert.equal(catalogRoundtrip.length,defaults.length);
assert.equal(catalogRoundtrip[1].name,defaults[1].name);
assert.equal(catalogRoundtrip[1].unitPrice,defaults[1].unitPrice);
assert.equal(catalogRoundtrip[1].taxRate,defaults[1].taxRate);

const formulaCatalog=core.catalogCSV([
  {id:"1",sku:"=CMD()",name:"+Formula",unitPrice:10,taxRate:22}
]);
assert.ok(formulaCatalog.includes("'=CMD()"));
assert.ok(formulaCatalog.includes("'+Formula"));
const formulaImported=core.catalogFromCSV(formulaCatalog);
assert.equal(formulaImported[0].sku,"=CMD()");
assert.equal(formulaImported[0].name,"+Formula");

const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const openInput=html.match(/<input[^>]+id="openQuoteFile"[^>]*>/)?.[0]||"";
assert.ok(openInput);
assert.ok(!/\saccept=/.test(openInput),"openQuoteFile must not use accept filtering because iOS blocks custom .qflow files");
assert.ok(html.includes('id="catalogList"'));
assert.ok(html.includes('id="importCatalogBtn"'));
assert.ok(html.includes('id="exportCatalogBtn"'));

console.log("OK - all QuoteFlow catalog and round-trip tests passed");
