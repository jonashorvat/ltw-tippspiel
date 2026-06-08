# 🏆 LightTheWorld Tippspiel
### Deutschland vs. Curaçao – Public Viewing

---

## Was ist das?

Eine vollständige Web-App für dein Public Viewing Tippspiel:
- **300 Gäste** können gleichzeitig über ihr Handy tippen
- **Live-Leaderboard** aktualisiert sich alle 10 Sekunden
- **Live-Daten** von API-Football (automatisch alle 60s)
- **Admin-Panel** zum Umschalten zwischen Live-Daten und manueller Eingabe
- **Test-Modus** mit Dummy-Teilnehmern und Zufallstipps

---

## Seiten

| URL | Beschreibung |
|-----|-------------|
| `/` | Weiterleitung zu `/guest` |
| `/guest` | Gäste-Formular (Handy) |
| `/leaderboard` | Live-Rangliste (Beamer) |
| `/admin` | Admin-Panel |

---

## Deploy auf Vercel – Schritt für Schritt

### 1. GitHub Repository erstellen

```bash
cd tippspiel
git init
git add .
git commit -m "Initial commit"
```

Dann auf github.com neues Repository erstellen (z.B. `ltw-tippspiel`) und:

```bash
git remote add origin https://github.com/DEIN_USERNAME/ltw-tippspiel.git
git push -u origin main
```

### 2. Vercel Projekt erstellen

1. vercel.com → "Add New Project"
2. GitHub-Repository auswählen
3. Framework: **Next.js** (automatisch erkannt)
4. Deploy klicken → App läuft!

### 3. Vercel KV Datenbank anlegen

1. Vercel Dashboard → dein Projekt → **Storage**
2. "Create Database" → **KV** wählen
3. Name: `tippspiel-db` → Create
4. "Connect to Project" → automatisch werden alle `KV_*` Env-Variablen gesetzt
5. Redeploy des Projekts

### 4. API-Football einrichten (für Live-Daten)

1. Gehe zu: https://rapidapi.com/api-sports/api/api-football
2. Kostenlos registrieren → "Subscribe to Test" (Free Plan)
3. Deinen API Key kopieren

In Vercel → Project Settings → Environment Variables:
```
API_FOOTBALL_KEY = dein_key_hier
MATCH_ID = (später eintragen, siehe Schritt 5)
ADMIN_SECRET = ein_sicheres_passwort
NEXT_PUBLIC_ADMIN_KEY = dasselbe_passwort
CRON_SECRET = ein_langer_zufaelliger_string
```

### 5. Match-ID herausfinden

Kurz vor dem Spiel die Match-ID über die API-Football Webseite oder folgenden API-Call herausfinden:

```
GET https://v3.football.api-sports.io/fixtures?team=10&season=2024
Header: x-apisports-key: DEIN_KEY
```

Team-ID 10 = Deutschland. Die ID des Deutschland-Curaçao Spiels in `MATCH_ID` eintragen und Vercel redeploy.

### 6. Cron Job aktivieren

In `vercel.json` ist der Cron bereits konfiguriert (jede Minute). Vercel aktiviert das automatisch auf Pro-Plan. Auf Free Plan: manuell über Admin-Panel "Sync auslösen" oder einfach manuellen Modus nutzen.

### 7. Custom Domain (optional)

Vercel Dashboard → Project → Settings → Domains → z.B. `tipp.deine-domain.de` eintragen.

---

## Punktesystem

| Frage | Exakt | Teilpunkte |
|-------|-------|-----------|
| Endstand | 3 Pkt | 1 Pkt Tendenz |
| Halbzeit | 3 Pkt | 1 Pkt Tendenz |
| Rote Karte | 2 Pkt | – |
| Elfmeter | 2 Pkt | – |
| Ecken Deutschland | 2 Pkt | 1 Pkt bei ±1 |
| Fouls gesamt | 2 Pkt | 1 Pkt bei ±2 |
| Torschütze | 2 Pkt | – |
| Tor in 1-10 Min | 2 Pkt | – |

---

## Ablauf am Event-Tag

1. **Vor dem Spiel**: `/admin` öffnen, Datenquelle auf "Live API" stellen (wenn API-Key vorhanden)
2. **Gäste einladen**: Link zu `/guest` über QR-Code oder WhatsApp teilen
3. **Beamer**: `/leaderboard` im Vollbild-Modus öffnen (F11)
4. **Nach dem Spiel**: Falls manueller Modus → `/admin` → "Auflösen" Tab → Ergebnisse eintragen

---

## Ohne Live-API (nur manuell)

Kein Problem! Einfach im Admin-Panel auf "Manuelle Eingabe" lassen und nach dem Spiel (oder live) die Ergebnisse im "Auflösen"-Tab eintragen. Punkte werden sofort neu berechnet.
