# VAIR Referee (mobile)

iOS + Android app for [vaireferee.com](https://vaireferee.com), built with Expo /
React Native. It is a native client of the **same** Supabase backend as the
website (`iunehbdazfzgfclkvvgd.supabase.co`) — same users, same auth, same
database, and critically the same `ask-referee` edge function. Two
capabilities are exposed, matching what was asked for:

- **AI Referee** — the chat interface (`screens/RefereeChatScreen.js`), for every signed-in user.
- **Admin** — full parity with `src/Admin.jsx` (`screens/admin/`), shown only when `profiles.is_admin` is true for the signed-in user (or they're the bootstrap admin email). Non-admins never see the tab.

## Why this doesn't re-implement the LLM call

The whole point of "minimize token usage" was already solved server-side, in
`supabase/functions/ask-referee/index.ts`: the ~150K-token IFAB Laws system
prompt is prompt-cached (1h TTL), `thinking` is disabled, and output is
capped at 300 tokens. Re-implementing any of that on-device would either
duplicate the Laws text in the app bundle (bad) or duplicate the caching
logic in two places that could drift (worse). So the app does neither — it
just calls the existing edge function with a bearer token, exactly like the
web app's `sendMessage()`. There is exactly one place LLM cost is controlled,
and this app doesn't add a second one.

## What's intentionally not in this app

Scope was AI Referee + Admin only, so the web app's other pages (Statistics,
Games Organizer, Features, About) aren't here. Voice dictation (the mic
button in the web chat) also isn't included — it depends on the browser's
Web Speech API, which has no equivalent without adding a native
speech-to-text module; flagging it as a possible follow-up rather than
silently dropping it.

## Project layout

```
mobile/
  App.js                     # navigation shell, session/role gating
  context/AuthContext.js     # session, isAdmin, password-recovery deep-link state
  lib/supabase.js            # Supabase client (AsyncStorage-backed session)
  lib/api.js                 # fetch() wrapper for edge functions (bearer + apikey)
  lib/authDeepLink.js        # parses password-reset / confirm email deep links
  screens/AuthScreen.js       screens/SetNewPasswordScreen.js
  screens/RefereeChatScreen.js
  screens/admin/              # AdminHomeScreen + one file per tab
  components/                 # Screen, Banner, ConfirmPasswordModal, AdminTabBar
  scripts/gen-assets.js       # regenerates PNG icons from ../public/vair-logo.svg
```

## Local development

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) for the fastest iteration
loop. One caveat: Expo Go uses its own `exp://` URL scheme, not this app's
`vairreferee://` scheme, so password-reset emails won't deep-link back into
Expo Go — you'll need a real build (see below) to test that specific flow
end-to-end. Everything else (login, signup, chat, all Admin tabs) works fine
in Expo Go.

## One-time setup you need to do (I can't do these for you)

### 1. Supabase — allow the app's redirect URLs

The app opens `vairreferee://reset-password` and `vairreferee://confirm` for
password-reset and signup-confirmation emails. Supabase rejects redirects
that aren't allow-listed, so add both in the **Supabase Dashboard → your
project → Authentication → URL Configuration → Redirect URLs**:

```
vairreferee://reset-password
vairreferee://confirm
```

(You already have the equivalent web ones there for vaireferee.com — this is
the same list, just adding the app's scheme.)

### 2. Apple Developer account (needed for iOS / TestFlight)

1. Go to https://developer.apple.com/programs/enroll/ and enroll as an
   **Individual** (fastest — no D-U-N-S number needed; an Organization
   account is slower to approve but lets the account be owned by a company
   rather than you personally).
2. Pay the $99/year fee. Approval is usually same-day for individual
   accounts.
3. Once approved, note the email you enrolled with — `eas login` /
   `eas build` will ask you to sign in with it.

### 3. Google Play Console account (needed for Android / Play internal testing)

1. Go to https://play.google.com/console/signup and pay the one-time $25
   registration fee.
2. Google now requires new **personal** accounts to run a 12-tester,
   14-day closed test before a production release — but that requirement is
   for the **production** track only. The **internal testing** track (what
   we're targeting) has no such gate and is available immediately, so this
   doesn't block getting the app onto your device.

### 4. EAS (Expo's build/submit service) — free tier is enough for this

```bash
npx eas-cli login          # creates/logs into an Expo account (free)
npx eas-cli init           # links this project, fills in app.json's extra.eas.projectId
```

## Building & shipping to internal testers

`eas.json` already defines the profiles used below (`production` builds a
store-ready binary; `preview` builds an ad-hoc internal-distribution binary
you can install via QR code without going through TestFlight/Play at all —
useful while waiting on the developer accounts to be approved).

### iOS → TestFlight

```bash
npx eas-cli build --platform ios --profile production
# EAS will offer to generate/manage your signing certificate + provisioning
# profile automatically — say yes unless you already have your own.
npx eas-cli submit --platform ios --latest
```

Then in **App Store Connect → your app → TestFlight**, add internal testers
by Apple ID email (up to 100, no App Review needed for internal testers —
they get access within minutes).

### Android → Play internal testing track

```bash
npx eas-cli build --platform android --profile production
```

Submitting via `eas submit` needs a Play Console **service account** JSON
key (Play Console → Setup → API access → create service account, grant it
Release Manager permissions, download the key):

```bash
npx eas-cli submit --platform android --latest
```

Then in **Play Console → your app → Testing → Internal testing**, create a
release (or confirm the one `eas submit` created), add testers by email or
Google Group, and share the opt-in link it gives you.

### Fastest path while accounts are pending: ad-hoc internal build

If you want the app on your phone today, before either developer account is
approved:

```bash
npx eas-cli build --platform ios --profile preview      # or android
```

For iOS this needs your device UDID registered with EAS first
(`eas device:create`) — Android has no such restriction. This produces an
installable link/QR code, no App Store or Play Console involved.

## Before a public store listing (not needed for internal testing)

- Replace the placeholder icons in `assets/` (currently auto-generated from
  the web logo via `node scripts/gen-assets.js`) with final designer PNGs —
  particularly `icon.png` (1024×1024, no transparency) and the Android
  adaptive-icon layers.
- Write a privacy policy and support URL (both required by App Store Connect
  and Play Console listings) — not needed for internal-only testing.
- Consider whether `com.vaireferee.app` (set in `app.json`) is the bundle
  ID / package name you want; it can't be changed after the first store
  submission.
