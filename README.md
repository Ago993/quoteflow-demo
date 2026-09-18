# QuoteFlow

Demo portfolio per creare preventivi professionali direttamente dal browser, con editor e anteprima documento in tempo reale.

**Demo online:** https://ago993.github.io/quoteflow-demo/

## Funzioni

- dati preventivo e cliente;
- righe prodotto/servizio modificabili;
- quantità e prezzo unitario;
- sconto percentuale per riga;
- imposta configurabile;
- calcolo automatico di subtotale, imposta e totale;
- esportazione del riepilogo in CSV;
- stampa / salvataggio PDF tramite browser.

## Privacy

L'elaborazione avviene interamente nel browser. La demo non invia dati a un backend.

## Test

```bash
node tests/test_core.js
```

## Avvio locale

```bash
python -m http.server 8020
```

Poi apri `http://localhost:8020/?demo=1`.

## Stack

HTML, CSS e JavaScript puro. Nessuna dipendenza runtime.

## Nota

Questa è una demo dimostrativa. In un progetto reale campi, imposte, numerazione, layout, regole di sconto e integrazioni verrebbero adattati alle esigenze del cliente.
