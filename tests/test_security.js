const assert=require("assert");
const fs=require("fs");
const path=require("path");
const core=require("../core.js");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");

const xss='<img src=x onerror=alert(1)>';
const formula='=1+1';
const csv=core.toCSV(core.calculate([{description:formula,qty:1,unitPrice:10,discountPct:0}],0));
assert.ok(csv.includes("'=1+1"));
assert.equal(core.linesFromCSV(csv)[0].description,formula);

const saved=core.serializeQuote({quoteNo:"Q-XSS",date:"2026-09-19",clientName:xss,clientEmail:"x@example.com",taxRate:22,validDays:30,lines:[{description:xss,qty:1,unitPrice:1,discountPct:0}]});
const reopened=core.parseQuote(saved);
assert.equal(reopened.clientName,xss);
assert.equal(reopened.lines[0].description,xss);

assert.throws(()=>core.parseCSV("a,b\n"+"x".repeat(core.LIMITS.fieldChars+1)+",1"),/troppo lungo/i);
assert.ok(/Content-Security-Policy/.test(html));
assert.ok(/script-src 'self'/.test(html));
assert.ok(/object-src 'none'/.test(html));
assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/.test(app));
console.log("OK - QuoteFlow security tests passed");
