# Firebreak Mobile

A thin Expo wrapper around the deployed Firebreak web app
(https://firebreak-beta.vercel.app), so it can be demoed on a phone through
Expo Go instead of a browser tab. This isn't a separate reimplementation --
every screen (dashboard, coverage map, trends, symptom checklist, Ask
assistant) is the same app already built in `../firebreak`, loaded natively
in a `WebView`.

## Run it

```
npm install
npx expo start
```

Scan the QR code with the Expo Go app (iOS/Android) to open it on a phone.

## What's actually here

- `App.tsx` -- a single-screen `WebView` pointing at the deployed site, with
  a loading state and a retry screen if the network request fails.
- `app.json` -- app name/icon plus the location and camera permission
  descriptions the web app's geolocation and sky-photo-upload features need
  when running inside a native WebView.
