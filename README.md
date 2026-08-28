# Family Hub — Android

Standalone Android version of Family Hub using Capacitor.

## What changed from the PHP version

- Family Hub data is stored on the Android device using local app storage.
- No PHP server or JSON backend is required.
- Weather uses the free Open-Meteo geocoding and forecast APIs directly.
- The closest city/town can be changed in Family Hub settings.
- Family members and colours are editable.
- Adding the first member automatically creates the protected `Family` group, which represents everyone.
- Backup/restore and **Clear everything & start again** remain available.
- Screensaver images are bundled into the APK.

## Build an APK on GitHub

1. Create a new GitHub repository.
2. Upload all files/folders from this project, including `.github`.
3. Commit to the `main` branch.
4. Open **Actions → Build Android APK**.
5. Run the workflow, or allow it to run automatically after a push to `main`.
6. When complete, download the **FamilyHub-APK** artifact.
7. Unzip the artifact to get `app-debug.apk`.

The debug APK can be installed directly on an Android phone/tablet after allowing installation from the browser/files app used to open it.

## Local Android Studio build

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

For a Play Store/release APK or AAB, configure Android signing before building a release.
