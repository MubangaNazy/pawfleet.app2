# PawFleet Android app: tracking that works with the screen off

The website cannot track you once the phone screen locks. The Android app can, the same way Strava does: it shows a small ongoing notification ("PawFleet is using your location") and Android lets it keep working.

## What is already done in the code

- One shared GPS engine (`src/lib/nativeLocation.ts`). In the app it uses the tracking plugin. In a browser it uses the normal GPS.
- Voice directions use the phone's own speech engine in the app, so they keep talking with the screen off.
- The Android settings that stop tracking pausing after 5 minutes are on.
- The special "background location" permission was removed. It is not needed and Google Play asks hard questions about it.

## Step by step (the first time)

### A. Get the new code and build the web part
1. Open **PowerShell**. Go to the project: `cd "C:\Users\HC COMPUTER STORE\Desktop\pawfleet 2\pawfleet.app2"`
2. Run `npm install`
3. Run `npm run build`
4. Run `npx cap sync android`. This copies the website into the Android app.

### B. Open it in Android Studio
5. Open **Android Studio**.
6. Click **Open**. Choose the folder `pawfleet.app2\android`. Click OK.
7. Wait for the bar at the bottom to stop moving. The first time can take 5 to 10 minutes.

### C. Put it on your phone
8. On your phone: **Settings > About phone**. Tap **Build number** 7 times. It says "You are now a developer".
9. **Settings > Developer options**. Turn on **USB debugging**.
10. Plug the phone into the computer with the cable. On the phone tap **Allow**.
11. In Android Studio, at the top, pick your phone in the device list. Click the green **Play** button.
12. The PawFleet app opens on your phone.

### D. Allow the things it needs
13. Log in as a walker. Tap **Go online**.
14. The phone asks for location. Choose **While using the app** or **Precise**. Tap Allow.
15. The phone asks to send notifications. Tap **Allow**. This is the ongoing "tracking" notification. Tracking will not survive the screen locking without it.
16. On some phones (Tecno, Infinix, Xiaomi, Samsung) also do this: **Settings > Apps > PawFleet > Battery > Unrestricted**. Without it these phones can stop the app after a few minutes.

### E. The test
17. Walker phone: **Go online**. See the notification appear at the top.
18. Owner phone (or the website on a computer): open the Live Map. You should see the walker.
19. Walker phone: press the power button so the screen goes black. Put it in your pocket.
20. Walk around for 10 minutes.
21. Owner: the pin should keep moving the whole time.
22. Walker phone: wake it. Voice directions should have spoken while it was locked.

If the pin stops when the screen locks: tell me what phone it is and I will look at that brand's battery rules.

## Making a version to share

For testers you can send the file, not the whole project:
1. Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. When it finishes click **locate**. The file is `app-debug.apk`.
3. Send it by WhatsApp. On the other phone, open it and allow "Install unknown apps".

For the Play Store you need a signed release (an "AAB" file). That is a separate step and I can walk you through it.

## Good to know

- The ongoing notification is required by Android. It cannot be hidden. Strava, Uber and Google Maps all show one.
- GPS in the background uses battery. The app asks for a new point about every 5 metres of movement.
- iPhone: needs a Mac. Not possible from Windows.
