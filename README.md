# QuoteFlow

Demo portfolio per creare, salvare, riaprire ed esportare preventivi professionali direttamente dal browser.

**Demo online:** https://ago993.github.io/quoteflow-demo/

## Funzioni

- catalogo locale di prodotti e servizi con 8 voci demo;
- ricerca rapida nel catalogo;
- aggiunta al preventivo con prezzo e IVA precompilati;
- creazione e modifica di prodotti personalizzati;
- importazione ed esportazione del catalogo in CSV;
- persistenza del catalogo nel browser;
- dati preventivo e cliente;
- righe prodotto/servizio modificabili;
- quantita, prezzo, sconto e IVA per singola riga;
- IVA predefinita per le voci manuali;
- calcolo automatico di subtotale, IVA e totale;
- importazione CSV di righe prodotto/servizio;
- esportazione CSV reimportabile;
- salvataggio completo in `.qflow`;
- riapertura di un preventivo salvato con ricostruzione dello stato;
- stampa / salvataggio PDF tramite browser.

## Catalogo

Il catalogo demo e preinstallato al primo avvio. I prodotti aggiunti al preventivo copiano prezzo e IVA nella singola riga: modificare successivamente il catalogo non cambia i preventivi gia creati o salvati.

Il catalogo puo essere esportato in CSV e usato come modello per preparare o aggiornare molti prodotti in Excel. Un CSV catalogo puo poi essere reimportato in QuoteFlow.

I dati del catalogo vengono salvati localmente nel browser tramite local storage. Non vengono inviati a un backend.

## Round-trip

Il file `.qflow` conserva numero, data, cliente, email, IVA predefinita, validita e tutte le righe, comprese le aliquote IVA per voce. Puo essere riaperto in QuoteFlow per continuare a modificare il preventivo. I vecchi file `.quoteflow.json` restano compatibili.

Il CSV e pensato invece per interoperabilita con Excel e altri strumenti tabellari. QuoteFlow riconosce separatori con virgola, punto e virgola o tab.

## Privacy

L'elaborazione avviene interamente nel browser. La demo non invia dati a un backend.

## Test

```bash
node tests/test_core.js
node tests/test_security.js
```

I test coprono catalogo, IVA per riga, export/import CSV, file .qflow, compatibilita con vecchi preventivi e payload malevoli.

## Avvio locale

```bash
python -m http.server 8020
```

Poi apri `http://localhost:8020/?demo=1`.

## Stack

HTML, CSS e JavaScript puro. Nessuna dipendenza runtime.

## Nota

Questa e una demo dimostrativa. Prezzi e aliquote del catalogo demo sono esempi e non costituiscono indicazioni fiscali. In un progetto reale campi, aliquote, numerazione, layout, regole di sconto e integrazioni verrebbero adattati alle esigenze del cliente.

![QuoteFlow demo](assets/quoteflow-demo.png)
