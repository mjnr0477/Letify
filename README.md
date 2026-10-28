# Letify — Voice Channel Lab

Letify is an experimental calling project. The first milestone tests whether two phones can exchange live voice through a WebRTC peer connection before we build a complete dialler.

## Current prototype

- Responsive calling-focused interface.
- Caller creates a WebRTC offer; recipient pastes it and creates an answer; caller applies that answer.
- Microphone permission, remote audio playback, mute and hang-up controls.
- STUN-assisted direct connection attempt.
- No accounts, backend signalling service, TURN relay, phone-number routing, or automatic incoming-call notifications yet.

## Important: what this does and does not do

This prototype is **not zero-data calling**. It needs a network connection to exchange the offer/answer codes through another channel and to use STUN. A direct WebRTC connection may fail behind restrictive NATs or firewalls because no TURN relay is configured. It cannot call ordinary telephone numbers or guarantee worldwide reachability.

An offline app cannot transport voice between distant phones unless a physical communication path exists. The zero-data channel remains a research goal, not a solved feature. Do not market this prototype as a production calling service or use it for emergency calls.

## Run locally

Requirements: Node.js 18 (or a compatible supported version) and npm.

```sh
npm install
npm start
```

Open the app over HTTPS or localhost in a browser that supports WebRTC. Microphone access is normally blocked on insecure non-local origins.

To create a production build:

```sh
npm run build
```

## How to try the experimental voice path

1. Open Letify on both phones using a secure browser context. Both phones need network connectivity and microphone permission.
2. On the caller phone, select **Create call link** and copy the offer code.
3. Send the offer code to the recipient through a separate channel.
4. On the recipient phone, choose **I have a call code**, paste the offer and create a reply code.
5. Send the reply code back to the caller.
6. Paste the reply on the caller phone and select **Connect call**.
7. If the connection succeeds, test audio, mute and hang-up.

Connection codes contain WebRTC session details and may reveal network metadata. Share them only with the intended person and discard them after use.

## Roadmap

1. Build and test the prototype on two real Android phones.
2. Add automated tests and diagnostics for permissions, connection state, and failure cases.
3. Design proper signalling and a TURN relay for reliable internet-assisted calls.
4. Research a separate, experimentally validated offline transport. Do not confuse this research with internet-assisted WebRTC.

## Project principles

- Never claim free offline calling before it is technically demonstrated.
- Prefer transparent connection status and understandable errors.
- Treat privacy, abuse prevention, reliability and emergency-call limitations as release blockers.
- Review dependency security and licensing before public release.
