# EventSpot — Setup & Run Guide

Complete guide to set up and run EventSpot on your local machine from scratch.

---

## Prerequisites

Make sure the following are installed before you begin:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18 or higher | https://nodejs.org |
| npm | comes with Node.js | — |
| Git | any | https://git-scm.com |
| Expo Go app | latest | Android / iOS app store |
| Android Studio *(for APK builds only)* | latest | https://developer.android.com/studio |

Verify your Node version:
```bash
node -v   # should print v18.x.x or higher
```

---

## Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd EventSpot
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

---

## Step 3 — Firebase Project Setup

EventSpot uses Firebase for authentication, database, and storage. You need your own Firebase project.

### 3.1 Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → enter a project name → click through the setup wizard

### 3.2 Enable Authentication
1. In your project → **Authentication** → **Get started**
2. Under **Sign-in method**, enable:
   - **Email/Password**
   - **Google** (required for Google sign-in)
3. For Google sign-in: note down the **Web client ID** shown under the Google provider settings — you need it for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

### 3.3 Enable Firestore
1. **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development) → select a region → click **Enable**

### 3.4 Enable Storage
1. **Storage** → **Get started**
2. Accept defaults and click **Done**

### 3.5 Get Firebase Config Keys
1. Go to **Project Settings** (gear icon, top left) → **General** tab
2. Scroll to **Your apps** → click **Add app** → choose the **Web** icon (`</>`)
3. Register the app (any nickname) → copy the `firebaseConfig` object values:

```js
const firebaseConfig = {
  apiKey: "...",           // → EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain: "...",       // → EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "...",        // → EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "...",    // → EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "...",// → EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "..."             // → EXPO_PUBLIC_FIREBASE_APP_ID
};
```

---

## Step 4 — Cloudinary Setup

EventSpot uploads event images to Cloudinary (free tier is sufficient).

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. After login, go to your **Dashboard**
3. Note down your **Cloud Name** (top of the dashboard) → `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`
4. Go to **Settings** → **Upload** tab → scroll to **Upload presets**
5. Click **Add upload preset**:
   - Set **Signing mode** to **Unsigned**
   - Save the preset name → `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

---

## Step 5 — Create the `.env` File

Create a file named `.env` in the project root (same folder as `package.json`):

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Sign-In (from Firebase Authentication → Google provider)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com

# Cloudinary (for event image uploads)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

> Never commit the `.env` file — it is already listed in `.gitignore`.

---

## Step 6 — Run the App

### Option A — Expo Go on a physical device (easiest)

1. Install the **Expo Go** app on your Android or iOS phone
2. Start the dev server:
   ```bash
   npm start
   ```
3. A QR code appears in the terminal
4. Scan it with:
   - **Android**: Expo Go app → Scan QR code
   - **iPhone**: native Camera app → tap the notification link
5. The app loads directly on your device

### Option B — Android Emulator

1. Open **Android Studio** → start a virtual device (AVD)
2. Run:
   ```bash
   npm start
   ```
3. Press **`a`** in the terminal → app opens in the emulator

### Option C — iOS Simulator (macOS only)

1. Requires **Xcode** installed from the Mac App Store
2. Run:
   ```bash
   npm start
   ```
3. Press **`i`** in the terminal → app opens in the simulator

### Option D — Install the APK directly (Android only)

A pre-built APK is included in `builds/apk/app-release.apk`.

1. Transfer the file to your Android phone via USB or any file sharing method
2. Open the file on your phone
3. If prompted, allow **Install from unknown sources** in settings
4. Install and open **EventSpot**

---

## Step 7 — Build a New APK (optional)

Only needed if you have made code changes and want to generate a fresh APK.

### Requirements
- Android Studio installed with the Android SDK
- Java 17+ (bundled with Android Studio)
- The `ANDROID_HOME` environment variable set

### Build commands

Release APK (for installation on devices):
```bash
npm run android:apk:release
```

Debug APK (for development/testing):
```bash
npm run android:apk:debug
```

Output is saved to:
```
builds/apk/app-release.apk
builds/apk/app-debug.apk
```

> If the icon or native config changes, run this first before building:
> ```bash
> npx expo prebuild --platform android
> ```

---

## Running Tests

```bash
# Run all tests
npm test -- --runInBand

# Run with coverage report
npm run test:coverage
```

---

## Firestore Security Rules (recommended for production)

By default Firestore is in test mode (open read/write). For a more secure setup, apply these rules in **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null
        && request.auth.uid == resource.data.createdBy;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

---

## Troubleshooting

**`Metro bundler` fails to start**
```bash
npm start -- --reset-cache
```

**`Unable to resolve module` errors**
```bash
rm -rf node_modules
npm install
```

**Android build fails with SDK not found**
- Open Android Studio → SDK Manager → install Android SDK Platform 34
- Set `ANDROID_HOME` in your shell profile:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk       # macOS
  export ANDROID_HOME=$HOME/Android/Sdk               # Linux
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

**Google sign-in does not work**
- Confirm `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set correctly in `.env`
- The Web client ID must come from Firebase Authentication → Google provider settings, not from Google Cloud Console directly

**Images do not upload**
- Check `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` are correct
- Confirm the upload preset is set to **Unsigned** in Cloudinary settings

**App crashes immediately on launch**
- Confirm all 9 environment variables in `.env` are filled in correctly
- Check the Firebase project has Auth, Firestore, and Storage all enabled

---

## Project Structure

```
EventSpot/
├── src/
│   ├── components/        Reusable UI components (modals, map controls, pickers)
│   ├── config/            Firebase initialisation and theme tokens
│   ├── constants/         Event category list
│   ├── contexts/          AuthContext — global auth state
│   ├── navigation/        Stack navigator setup
│   ├── screens/           Login, Register, Map, Profile, MyEvents
│   ├── services/          Firestore CRUD, image upload, user preferences
│   └── utils/             Location, filtering, and date utilities
├── assets/                App icons and splash image
├── builds/apk/            Generated APK files
├── scripts/               APK build script
├── App.js                 Entry point
├── app.json               Expo configuration
└── .env                   Local environment variables (not committed)
```

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `expo` ~55 | Development framework |
| `firebase` ^12 | Auth, Firestore, Storage |
| `react-navigation` v7 | Screen navigation |
| `react-native-paper` v5 | Material Design UI components |
| `react-native-webview` | Leaflet.js map rendering |
| `expo-location` | Device GPS coordinates |
| `expo-image-picker` | Camera and gallery access |
| `@react-native-community/datetimepicker` | Date/time picker |
