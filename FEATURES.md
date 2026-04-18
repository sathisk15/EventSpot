# EventSpot — Features & Scope

## Overview
EventSpot is a location-based event discovery and management mobile application built with React Native and Expo. Users can explore events on an interactive map, create their own events, and track attendance interest.

---

## Core Features

### Authentication
- Email and password registration and login
- Google OAuth sign-in
- Persistent sessions across app restarts
- Password change from profile settings

### Interactive Map
- OpenStreetMap-powered map via Leaflet.js (WebView)
- Event markers plotted by GPS coordinates
- Tap on a marker to view event details
- Tap anywhere on the map to create a new event at that location
- Current location button to center map on user

### Event Discovery
- Browse all events on the map
- Filter events by category (Music, Sports, Food, Networking, Arts, Education, Community, Other)
- Search events by name or address
- Real-time event updates via Firestore live sync (toggleable)

### Event Creation & Management
- Create events by tapping the map or entering an address manually
- Add event name, description, and category
- Upload event images from camera or photo library
- Set start date/time and end date/time with auto-calculated duration
- Edit or delete events you own
- View your own events in the My Events screen

### Event Details
- Full event detail view with image display
- Attendee interest count
- Interest toggle (attend / unattend) for non-owners
- Owner controls (edit, delete) shown inline

### User Profile
- Display name and bio
- Social link
- Profile photo (camera or gallery)
- Toggle real-time event syncing on/off
- Logout

---

## Technical Scope

| Area | Details |
|------|---------|
| Platform | Android, iOS, Web (via Expo) |
| Backend | Firebase (Auth, Firestore, Storage) |
| Maps | WebView + Leaflet.js + OpenStreetMap |
| State | React Context API |
| Navigation | React Navigation v7 (Native Stack) |
| UI | React Native Paper (Material Design) |
| Media | expo-image-picker, expo-location |
| Testing | Jest + React Native Testing Library |
| Build | Expo (APK export supported) |

---

## Out of Scope (Current Version)
- Push notifications
- Event recommendations or personalisation
- Offline mode / local caching
- Social following or friend lists
- Event sharing or deep links
- Event moderation or reporting
- Paid or ticketed events
