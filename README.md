# Lupon Intelligence — Chrome Extension

> Ad ops intelligence tool for Lupon Media publishers. Built on Professor Prebid, enhanced with Lupon Lab Bridge.

## Instalacija (kolege)

### Opcija 1 — Bez builda (preporučeno)

1. Idi na: **[github.com/lupondev/professor-prebid/releases](https://github.com/lupondev/professor-prebid/releases)**
2. Skini najnoviji `lupon-intelligence-vX.X.X.zip`
3. Raspakiraj ZIP
4. Chrome → `chrome://extensions` → uključi **Developer mode** (gore desno)
5. Klikni **Load unpacked** → odaberi raspakirani folder
6. ✅ Lupon Intelligence je instaliran

### Opcija 2 — Build iz source-a

```bash
git clone https://github.com/lupondev/professor-prebid.git
cd professor-prebid
npm install
npm run build
```

Pa u Chromeu:
- `chrome://extensions` → Developer mode ON → **Load unpacked** → odaberi `build/` folder

## Korištenje s Lupon Ad Lab

1. Instaliraj extension (gore)
2. Otvori **[cdn.luponmedia.com/lab/inspector](https://cdn.luponmedia.com/lab/inspector/)**
3. Otvori publisher sajt (npr. novi.ba) u drugom tabu
4. Klikni **Pull Live Data** → Inspector automatski čita pbjs podatke
5. Klikni **📊 Report** za generisanje izvještaja

## Što radi

- Detektuje Prebid.js na bilo kojoj stranici (uključujući DABPlus wrapper koji koriste adxbid publisheri)
- Čita live auction data: ad units, bidders, CPM, events, config
- Šalje podatke u Lupon Ad Lab Inspector via secure bridge
- Prikazuje AI dijagnozu (Lupon Intelligence tab)

## Requirements

- Node.js ≥ 15.12.0 (samo za build)
- Chrome browser

## Repo

`github.com/lupondev/professor-prebid` (master branch)
