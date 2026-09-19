const assert=require("assert");
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

const bounded=core.calculate([{description:"X",qty:-1,unitPrice:-10,discountPct:150}],0);
assert.equal(bounded.items[0].qty,0);
assert.equal(bounded.items[0].unitPrice,0);
assert.equal(bounded.items[0].discountPct,100);
assert.equal(bounded.total,0);

const decimal=core.calculate([{description:"Y",qty:"2,5",unitPrice:"10,40",discountPct:"5"}],"10");
assert.equal(decimal.subtotal,24.7);
assert.equal(decimal.tax,2.47);
assert.equal(decimal.total,27.17);

const csv=core.toCSV(result);
assert.ok(csv.includes("Descrizione"));
assert.ok(csv.includes("Servizio A"));
assert.ok(csv.includes("Totale"));

const reimported=core.linesFromCSV(csv);
assert.equal(reimported.length,2);
assert.equal(reimported[0].description,"Servizio A");
assert.equal(reimported[0].qty,2);
assert.equal(reimported[0].unitPrice,100);
assert.equal(reimported[0].discountPct,10);

const italianCsv='Descrizione;Quantita;Prezzo unitario;Sconto %\n"Analisi dati";2;125,50;5\n"Setup";1;80,00;0\n';
const italianLines=core.linesFromCSV(italianCsv);
assert.equal(italianLines.length,2);
assert.equal(italianLines[0].unitPrice,125.5);
assert.equal(italianLines[0].discountPct,5);

const state={
  quoteNo:"Q-2026-099",
  date:"2026-09-19",
  clientName:"Cliente Test",
  clientEmail:"cliente@example.com",
  taxRate:22,
  validDays:45,
  lines:[
    {description:"Servizio A",qty:2,unitPrice:100,discountPct:10},
    {description:"Servizio B",qty:1,unitPrice:50,discountPct:0}
  ]
};

const saved=core.serializeQuote(state);
const reopened=core.parseQuote(saved);
assert.deepEqual(reopened,core.normalizeQuoteState(state));
assert.equal(core.calculate(reopened.lines,reopened.taxRate).total,280.6);

let invalidRejected=false;
try{core.parseQuote('{"format":"other","version":1,"quote":{}}');}
catch(err){invalidRejected=/non e un preventivo QuoteFlow/.test(err.message);}
assert.equal(invalidRejected,true);

const fs=require("fs");
const path=require("path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const openInput=html.match(/<input[^>]+id="openQuoteFile"[^>]*>/)?.[0]||"";
assert.ok(openInput);
assert.ok(!/\saccept=/.test(openInput),"openQuoteFile must not use accept filtering because iOS blocks custom .qflow files");

console.log("OK - all QuoteFlow round-trip tests passed");
