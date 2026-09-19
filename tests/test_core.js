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

const bounded=core.calculate([{description:"X",qty:-1,unitPrice:-10,discountPct:150}],0);
assert.equal(bounded.items[0].qty,0);
assert.equal(bounded.items[0].unitPrice,0);
assert.equal(bounded.items[0].discountPct,100);

const decimal=core.calculate([{description:"Y",qty:"2,5",unitPrice:"10,40",discountPct:"5"}],"10");
assert.equal(decimal.total,27.17);

const csv=core.toCSV(result);
const reimported=core.linesFromCSV(csv);
assert.equal(reimported.length,2);
assert.equal(reimported[0].description,"Servizio A");

const italianCsv='Descrizione;Quantita;Prezzo unitario;Sconto %\n"Analisi dati";2;125,50;5\n"Setup";1;80,00;0\n';
const italianLines=core.linesFromCSV(italianCsv);
assert.equal(italianLines[0].unitPrice,125.5);

const formula='=HYPERLINK("https://evil.invalid","click")';
const formulaCsv=core.toCSV(core.calculate([{description:formula,qty:1,unitPrice:1,discountPct:0}],0));
assert.ok(formulaCsv.includes("'=HYPERLINK"));
assert.equal(core.linesFromCSV(formulaCsv)[0].description,formula);

const htmlPayload='<img src=x onerror=alert(1)>';
const state={
  quoteNo:"Q-2026-099",
  date:"2026-09-19",
  clientName:"Cliente <script>alert(1)</script>",
  clientEmail:"cliente@example.com",
  taxRate:22,
  validDays:45,
  lines:[{description:htmlPayload,qty:2,unitPrice:100,discountPct:10}]
};
const saved=core.serializeQuote(state);
const reopened=core.parseQuote(saved);
assert.deepEqual(reopened,core.normalizeQuoteState(state));
assert.equal(reopened.lines[0].description,htmlPayload);

assert.throws(()=>core.parseQuote("x".repeat(core.LIMITS.quoteChars+1)),/troppo grande/);
assert.throws(()=>core.linesFromCSV("Descrizione,Quantita,Prezzo unitario\n"+"x".repeat(core.LIMITS.fieldChars+1)+",1,1"),/troppo lungo/);

const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
const openInput=html.match(/<input[^>]+id="openQuoteFile"[^>]*>/)?.[0]||"";
assert.ok(openInput);
assert.ok(!/\saccept=/.test(openInput),"iOS must be allowed to select custom .qflow files");
assert.ok(/Content-Security-Policy/.test(html));
assert.ok(/script-src 'self'/.test(html));
assert.ok(/object-src 'none'/.test(html));
assert.ok(!/\.innerHTML\s*=/.test(app),"Dynamic data must not be rendered through innerHTML");

console.log("OK - QuoteFlow security and round-trip tests passed");
