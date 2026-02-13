# Fraction Conquest

Fraction Conquest ist ein browserbasiertes Lernspiel zum Üben von Brüchen (Klassen 5-7, Alter 11-13).  
Die Spielerin oder der Spieler löst Mathematikaufgaben und erobert Gebiete auf der Karte: richtige Antworten erweitern die Kontrolle, falsche Antworten führen zu Verlusten.

Sprachversionen:

- Russisch: `README.ru.md`
- Deutsch: `README.de.md`

## Idee der Anwendung

Das Projekt verbindet:

- Bruchtraining mit schrittweiser Erklärung
- Kurze Spielzyklen mit sichtbarem Fortschritt (Karteneroberung)
- Einstellbaren Schwierigkeitsgrad und Themen für Schule und Selbstlernen

Das Ziel ist, regelmäßiges Bruchtraining motivierender zu machen, ohne externe Abhängigkeiten oder komplizierten Build-Prozess.

## Hauptfunktionen

- 11 Bruchthemen (Kürzen, gemischte Zahlen, Rechenoperationen, Dezimalzahlen, kombinierte Ausdrücke)
- 4 Schwierigkeitsstufen
- Eroberungs-Gameplay mit sofortigem Feedback
- Erklärungstexte bei falschen Antworten
- RU/DE-Lokalisierung in der App
- Admin-Seite für Einstellungen (`admin.html`)
- Integrierte Testseite für den Math-Engine-Check (`test.html`)
- Reines Frontend: HTML + CSS + JavaScript (ohne Frameworks und Build-Schritt)

## Lokales Starten

### Option 1: Direkt öffnen (am schnellsten)

1. Repository herunterladen:
   - `git clone https://github.com/gluonMaster/Educational-game.git`
   - oder ZIP von GitHub herunterladen und entpacken
2. Projektordner öffnen.
3. Dateien im Browser starten:
   - Spiel: `index.html`
   - Einstellungen: `admin.html`
   - Tests: `test.html`

### Option 2: Mit lokalem Server (empfohlen)

Im Projektordner ausführen:

```bash
python -m http.server 8000
```

Dann öffnen:

- `http://localhost:8000/index.html`
- `http://localhost:8000/admin.html`
- `http://localhost:8000/test.html`

## Steuerung

- Maus: Klick auf eine von 6 Antwortoptionen
- Tastatur: Tasten `1-6` wählen Antworten
- Nach einer falschen Antwort mit `Continue` zur nächsten Aufgabe wechseln

## Technische Hinweise

- Empfohlene Desktop-Auflösung: `1024x768` oder höher
- Zielbrowser: Chrome/Firefox/Edge 90+
- Einstellungen und Fortschritt werden in `localStorage` gespeichert
