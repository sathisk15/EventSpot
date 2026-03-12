# EventSpot

EventSpot is a React Native + Expo mobile app for discovering, creating, and managing location-based events. It is designed as a multimedia systems semester project and combines maps, geolocation, images, Firebase backend services, and real-time updates.

## Features

- User authentication with Firebase Auth
- Profile management with bio, social link, profile photo, and app settings
- Interactive map view for browsing nearby events
- Custom droplet-style event markers with event images
- Create events from:
  - the map by tapping a location
  - the action menu with manual search
- Event images from camera or photo library
- Event schedule with start date/time, end date/time, and duration
- Event categories
- Search by location
- Filter events by event name, address, and category
- Clear all search/filter state in one action
- Interest system for non-owner users
- Interest count display
- Owner-only edit and delete actions
- `My Events` screen for managing events created by the logged-in user
- Direct `View Event` navigation from `My Events` to the map
- Optional real-time event syncing using Firestore listeners
- APK build script that copies generated APKs into the project

## Tech Stack

- React Native
- Expo
- React Navigation
- React Native Paper
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Expo Location
- Expo Image Picker
- React Native WebView
- Jest + React Native Testing Library

## Project Structure

```text
src/
  components/      Reusable UI such as event modals
  config/          Firebase configuration
  constants/       Static app constants such as event categories
  contexts/        Shared app state such as authentication
  navigation/      Navigation setup
  screens/         Main app screens
  services/        Firestore, storage, and preference helpers
```

## Prerequisites

- Node.js 18+
- npm
- Expo CLI tooling through `npx expo`
- Android Studio and SDK for Android builds
- A Firebase project with:
  - Authentication enabled
  - Cloud Firestore enabled
  - Cloud Storage enabled

## Environment Variables

Create a local `.env` file in the project root and define:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

These values are consumed in [src/config/firebase.js](/Users/Sathiskumar/Master's%20ACS/Sem%20-%203/MMS%20Project/EventSpot/src/config/firebase.js).

## Installation

```bash
npm install
```

## Running the App

Start the Expo development server:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

## Testing

Run all tests:

```bash
npm test -- --runInBand
```

Run coverage:

```bash
npm run test:coverage
```

## APK Generation

Generate a release APK:

```bash
npm run android:apk:release
```

Generate a debug APK:

```bash
npm run android:apk:debug
```

Generated APK files are copied to:

```text
builds/apk/
```

Typical outputs:

- `builds/apk/app-release.apk`
- `builds/apk/app-debug.apk`

## Real-Time Events Setting

The profile page contains a `Realtime Events` toggle.

- Default: `off`
- `off`: the app uses standard fetch-based refresh behavior
- `on`: the app subscribes to Firestore real-time event updates

## Notes

- A debug APK requires Metro in development contexts. For standalone installation on a phone, use the release APK.
- Location permission is required for map centering and current-location event creation.
- Camera and gallery permissions are required for image upload features.

## Suggested Demo Flow

For project presentation or viva, a good demo sequence is:

1. Register or log in
2. Create an event with image, category, and schedule
3. Tap on the map to create another event from a selected location
4. Show filters by category and name
5. Open `My Events`, then edit, view, or delete an event
6. Show event interest on another user account
7. Toggle real-time mode and demonstrate live updates

## Future Improvements

- Push notifications for event updates
- Better ranking or recommendation of events
- Offline caching
- Event sharing
- Image compression and optimization
- Admin moderation tools

## License

This project is currently intended for academic use as a semester project.
