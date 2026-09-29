# Pharmalive Haydovchi — Android driver app

Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router
Package: `uz.pharmalive.driver` · API: `https://api.pharmalive.uz/api/v1` (set in `app.json` → `extra.apiUrl`)

## Screens
| Screen | What the driver does |
|---|---|
| Login | Phone + password (drivers only; tokens stored in the encrypted Secure Store) |
| Yetkazishlar (home) | Today's deliveries, counters, **Yo'lga chiqish** (start trip), big **QR skanerlash** button, pull to refresh |
| Delivery details | Pharmacy, address, packages, **call** button, **map** (Yandex route), Delivered / Not delivered |
| QR scanner | Full-screen camera, torch; the server checks every code (wrong driver, already delivered, cancelled, replaced label…) |
| Confirm | Photo (resized to ~200 KB), GPS, note → **YETKAZILDI** |
| Not delivered | Reason list, comment, optional photo |
| History | Last 30 days |
| Profile | Name, version, logout |

Safe on bad mobile internet: every delivery carries a unique request ID, so pressing the button again after a network error never creates a second delivery.

---

## Build the APK: option A, Expo EAS (recommended, ~15 min, free)
You need Node.js 20+ on your computer and a free account at https://expo.dev.

```bash
cd driver-app
npm install
npm install -g eas-cli
eas login                      # your expo.dev account
eas init                       # links the project to your account (answer "Yes")
eas build -p android --profile preview
```
When the build finishes (10–20 min), EAS prints a link and a QR code. Open it on the phone → download the APK → install.
Android will ask to allow "Install unknown apps" for your browser; allow it once.

Later, for the Play Store: `eas build -p android --profile production` (creates an .aab signed with a key EAS keeps for you).

## Option B: GitHub Actions (no tools on your computer)
1. Create a **private** GitHub repository and upload the `driver-app/` folder **and** the `.github/` folder to it.
2. GitHub → **Actions** → "Driver app APK" → **Run workflow**.
3. After ~15 min open the run → **Artifacts** → download `pharmalive-driver-apk` → unzip → `app-release.apk`.

This APK is signed with a test (debug) key. It's fine for the demo, but use option A for the Play Store.

## Test accounts
Create drivers in the web panel → **Xodimlar**, with role "Haydovchi" and the phone number as login.

## Development
```bash
npm install
npx tsc --noEmit                         # type check
npx expo export --platform android       # verify the bundle compiles
```
The camera and GPS need a real build (APK); they don't work in the Expo Go app with this configuration.
