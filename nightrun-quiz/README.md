# Night Run Quiz

A real-time multiplayer quiz (Kahoot-style) for **Night Run**, the running club in Tashkent
([nightrun.uz](https://nightrun.uz)). The host shows questions on a big screen, runners answer on
their phones. The whole interface is in Uzbek (Latin script).

- **Node.js + Express + Socket.io**, vanilla HTML/CSS/JS, no build step
- Quizzes are stored in `data/quizzes.json`; games live in memory

## Quick start

```bash
cd nightrun-quiz
cp .env.example .env      # then edit HOST_PASSWORD
npm install
npm start
```

Open:

| Page | URL | Who |
| --- | --- | --- |
| Player | `http://localhost:3000/` | runners, on their phones |
| Host panel | `http://localhost:3000/host` | the host, password-protected |
| Big screen | opened from the host panel (`/screen?quiz=…`) | projector |

Requires Node.js 18 or newer.

### Running a game at a meetup

1. Open `/host`, log in, press **O'yinni boshlash** (Start game) on a quiz.
2. The big screen opens with the 6-digit room code and a QR code. Put it on the projector
   (press **F** or the ⛶ button for full screen).
3. Runners scan the QR or open the site and type the code + a nickname.
4. Press **Startga!** (or the space bar) to start. After each question press space / the button
   for the next one.

Big screen keys: **Space / Enter / →** next, **M** mute, **F** full screen.
Click a player's name in the lobby to remove them (e.g. an inappropriate nickname).
**Vaqtni tugatish** ends the current question early.

**Laptop on local Wi-Fi:** if you open the big screen at `localhost`, the server automatically puts
your laptop's LAN address (e.g. `http://192.168.1.5:3000`) into the QR code so phones on the same
Wi-Fi can join. If that picks the wrong network, set `PUBLIC_URL`.

## Configuration (`.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `HOST_PASSWORD` | `nightrun` | Password for `/host`. **Always set this.** Changing it logs out all hosts. |
| `PORT` | `3000` | HTTP port (Render sets it automatically). |
| `PUBLIC_URL` | auto | Address used in the join link / QR, e.g. `https://quiz.nightrun.uz`. |
| `DATA_FILE` | `data/quizzes.json` | Where quizzes are saved. |

To set the host password locally, put `HOST_PASSWORD=your-secret` in `.env` and restart.
On Render, set it under **Environment** in the service settings.

## Deploying to Render

**Option A: Blueprint (uses `render.yaml`)**

1. Push the repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. Render reads `nightrun-quiz/render.yaml`
   (if Render asks for the blueprint path, give it `nightrun-quiz/render.yaml`).
3. Enter a value for `HOST_PASSWORD` when prompted, then **Apply**.

**Option B: manual Web Service**

1. **New → Web Service**, connect the repo.
2. Root directory: `nightrun-quiz` · Runtime: Node · Build command: `npm install` · Start command: `npm start`.
3. Environment: add `HOST_PASSWORD`. Optionally add `PUBLIC_URL` (your Render URL or custom domain).
4. Deploy. The health check endpoint is `/healthz`.

WebSockets work on Render out of the box.

> **Heads-up about storage on Render:** the free plan's disk is wiped on every deploy/restart, so
> quizzes you create in the panel and uploaded images will be lost. Either attach a
> **Persistent Disk** (paid plans) and point `DATA_FILE` at it, e.g. `/var/data/quizzes.json`, or
> keep your quizzes in `data/quizzes.json` in git (edit locally, commit, deploy). Free instances also
> sleep when idle; open the site a minute before the meetup to wake it up.

### Deploying to a VPS

```bash
git clone <repo> && cd <repo>/nightrun-quiz
npm install --omit=dev
cp .env.example .env && nano .env   # set HOST_PASSWORD and PUBLIC_URL
npm start                           # or run it with pm2 / systemd
```

Behind nginx, forward WebSocket upgrades:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Run a single Node process: game state is in memory, so don't run several instances behind a load balancer.

## Scoring

- Correct answer: up to **1000** points depending on speed (instant = 1000, last second = 500).
- Streak bonus: **+100** on every correct answer once you have 3 or more correct in a row
  (the 3rd, 4th, 5th… in a row each get +100).
- Wrong answer or no answer: **0**, and the streak resets.

Rules live in `src/scoring.js`.

## Reconnecting

Each player gets a private session token saved in the phone's browser. If the phone locks,
the browser reloads, or the connection drops, the page reconnects on its own and the player
continues with the same score. A question doesn't wait for players who are offline.

## Project structure

```
nightrun-quiz/
├── server.js              Express app, REST API, host auth, image upload
├── src/
│   ├── game.js            Game state machine (lobby → intro → question → reveal → podium)
│   ├── sockets.js         Socket.io events for host screen and players
│   ├── quizStore.js       Load/save/validate quizzes in the JSON file
│   └── scoring.js         Points and streak rules
├── data/quizzes.json      Quizzes (seeded with "Yugurish bo'yicha viktorina")
├── public/
│   ├── index.html         Player page (mobile-first)
│   ├── host.html          Host panel: login, quiz editor
│   ├── screen.html        Big screen for the projector
│   ├── lang/uz.js         ALL user-facing strings
│   ├── css/               base.css (theme), player.css, host.css, screen.css
│   ├── js/                common.js, sound.js, confetti.js, player.js, host.js, screen.js
│   ├── img/               put logo.png here
│   └── uploads/           images uploaded from the host panel
├── test/e2e.js            End-to-end test (server + host + 3 players)
└── render.yaml            Render blueprint
```

### Logo

The "Night Run" wordmark is rendered as text. Drop your logo at `public/img/logo.png` and it
replaces the text on every page automatically (the text shows if the file is missing).

### Adding Russian later

All strings are in `public/lang/uz.js` (keys are shared; server errors are sent as codes and
translated on the client). Copy it to `ru.js`, translate the values, and load `ru.js` instead of
`uz.js` in the three HTML pages (or add a switch that picks the file).

## Tests

```bash
npm test
```

Starts the server on a random port with a temporary copy of the quiz file, then:
tests login and quiz create/edit/delete/upload, creates a room, joins 3 players (checking
wrong code, invalid and duplicate nicknames), plays all 10 seeded questions, and checks
speed scoring, the streak bonus, a wrong answer resetting the streak, a player dropping
mid-question and rejoining with the same score, the host ending a question early, and the
final podium order.
