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

console.log("OK - all QuoteFlow tests passed");
