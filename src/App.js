import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

function App() {
  const [mode, setMode] = useState("start");
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState("Ready to connect");
  const [error, setError] = useState("");
  const [signal, setSignal] = useState("");
  const [remoteSignal, setRemoteSignal] = useState("");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
  }, []);

  const waitForIce = (pc) => new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timeout = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    }, 12000);
    function check() {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", check);
  });

  const prepareConnection = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      throw new Error("This browser does not support voice calling. Open Letify over HTTPS in a supported browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = stream;
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      if (audioRef.current) audioRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") { setStatus("Connected · voice channel active"); setMode("active"); }
      else if (state === "connecting") setStatus("Connecting to peer…");
      else if (state === "disconnected") setStatus("Connection interrupted");
      else if (state === "failed") setStatus("Connection failed · this network may require a relay");
      else if (state === "closed") setStatus("Call ended");
    };
    return pc;
  };

  const startCall = async () => {
    setError("");
    setBusy(true);
    try {
      const pc = await prepareConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setStatus("Preparing secure connection details…");
      await waitForIce(pc);
      setSignal(JSON.stringify(pc.localDescription));
      setMode("offer");
      setStatus("Offer ready · share it securely with the recipient");
    } catch (e) {
      setError(e.message || "Could not start the call.");
      setStatus("Could not start call");
    } finally {
      setBusy(false);
    }
  };

  const createAnswer = async () => {
    setError("");
    setBusy(true);
    try {
      const parsed = JSON.parse(remoteSignal);
      if (parsed.type !== "offer" || !parsed.sdp) throw new Error("That code is not a valid call offer.");
      const pc = await prepareConnection();
      await pc.setRemoteDescription(parsed);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setStatus("Preparing reply…");
      await waitForIce(pc);
      setSignal(JSON.stringify(pc.localDescription));
      setMode("answer");
      setStatus("Reply ready · send it back to the caller");
    } catch (e) {
      setError(e instanceof SyntaxError ? "The call code is incomplete or invalid JSON." : (e.message || "Could not answer the call."));
      setStatus("Could not answer call");
    } finally {
      setBusy(false);
    }
  };

  const acceptAnswer = async () => {
    setError("");
    try {
      const parsed = JSON.parse(remoteSignal);
      if (parsed.type !== "answer" || !parsed.sdp) throw new Error("Paste the recipient's answer code.");
      if (!pcRef.current) throw new Error("Start a call first, then paste the reply.");
      await pcRef.current.setRemoteDescription(parsed);
      setMode("connecting");
      setStatus("Answer received · connecting…");
    } catch (e) {
      setError(e instanceof SyntaxError ? "The reply code is incomplete or invalid JSON." : e.message);
    }
  };

  const endCall = () => {
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current = null;
    streamRef.current = null;
    setSignal("");
    setRemoteSignal("");
    setMuted(false);
    setMode("start");
    setStatus("Call ended · ready for another");
    setError("");
  };

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  const copySignal = async () => {
    try {
      await navigator.clipboard.writeText(signal);
      setStatus("Connection code copied");
    } catch {
      setError("Copy was blocked. Select and copy the code manually.");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href={process.env.PUBLIC_URL || "/"} aria-label="Letify home"><span className="brand-mark">L</span><span>letify</span></a>
        <span className="prototype-tag"><span className="pulse" /> CHANNEL LAB</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> A NEW WAY TO CONNECT</div>
        <h1>Voice should bring<br /><span>people closer.</span></h1>
        <p className="hero-copy">Letify is an experimental voice channel for direct phone-to-phone conversations. We're testing the connection itself first.</p>
      </section>

      <section className="call-card" aria-label="Letify calling prototype">
        <div className="card-heading">
          <div><div className="section-kicker">VOICE CHANNEL</div><h2>{mode === "active" ? "You're in a call" : mode === "connecting" ? "Connecting…" : mode === "offer" ? "Start your connection" : mode === "answer" ? "Send your reply" : "Start a conversation"}</h2></div>
          <span className={status.includes("active") || status.includes("Connected") ? "status-pill online" : "status-pill"}><span />{status}</span>
        </div>

        {mode === "start" && <>
          <label className="field-label" htmlFor="phone">Phone number <span>identity lookup not connected yet</span></label>
          <div className="phone-field"><span className="phone-prefix">＋</span><input id="phone" type="tel" autoComplete="tel" placeholder="Enter a phone number" value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <p className="hint">The number is not looked up or dialed yet. This test proves the voice path first; registered-user lookup and automatic ringing are the next build stage.</p>
          <button className="primary-button" onClick={startCall} disabled={busy}>{busy ? <><span className="spinner" /> Preparing…</> : <>Create call link <span>↗</span></>}</button>
          <div className="or-divider"><span /> OR <span /></div>
          <button className="secondary-button" onClick={() => { setMode("join"); setError(""); }}>I have a call code <span>→</span></button>
        </>}

        {mode === "join" && <>
          <label className="field-label" htmlFor="remote-offer">Paste the caller's offer code</label>
          <textarea id="remote-offer" value={remoteSignal} onChange={(e) => setRemoteSignal(e.target.value)} placeholder="Paste the complete connection code here…" rows={5} />
          <button className="primary-button" onClick={createAnswer} disabled={busy || !remoteSignal.trim()}>{busy ? "Preparing reply…" : "Create reply code →"}</button>
          <button className="text-button" onClick={() => { setMode("start"); setError(""); }}>← Back</button>
        </>}

        {(mode === "offer" || mode === "answer") && <>
          <div className="step-note"><span className="step-number">{mode === "offer" ? "1" : "2"}</span><div><strong>{mode === "offer" ? "Send this offer to the other person" : "Send this reply to the person who called"}</strong><p>Use another available channel to exchange this code. Treat it as temporary connection information.</p></div></div>
          <textarea className="signal-box" readOnly value={signal} rows={5} aria-label="Your connection code" />
          <button className="primary-button" onClick={copySignal}>Copy connection code <span>▣</span></button>
          {mode === "offer" && <div className="reply-area"><label className="field-label" htmlFor="answer-code">Then paste their reply here</label><textarea id="answer-code" value={remoteSignal} onChange={(e) => setRemoteSignal(e.target.value)} placeholder="Recipient's reply code…" rows={4}/><button className="secondary-button" onClick={acceptAnswer} disabled={!remoteSignal.trim()}>Connect call →</button></div>}
          {mode === "answer" && <p className="hint success-hint">Reply created. Once the caller applies it, the voice connection may establish if both networks allow a direct route.</p>}
          <button className="text-button" onClick={endCall}>Cancel call</button>
        </>}

        {(mode === "active" || mode === "connecting") && <>
          <div className="call-avatar"><span> L </span><div><strong>{number || "Letify contact"}</strong><p>{mode === "connecting" ? "Establishing voice connection…" : "Voice connection"}</p></div></div>
          <div className="call-controls"><button className={muted ? "round-control selected" : "round-control"} onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"}><span>{muted ? "×" : "♩"}</span><small>{muted ? "Unmute" : "Mute"}</small></button><button className="hangup-button" onClick={endCall} aria-label="End call">✕</button><span className="end-label">End call</span></div>
          <p className="hint">If the call does not connect, the networks may require a TURN relay. This prototype has no relay service configured.</p>
        </>}

        {error && <div className="error-box" role="alert">{error}</div>}
        <audio ref={audioRef} autoPlay playsInline />
      </section>

      <section className="reality-note"><div className="note-icon">i</div><div><strong>Honest status: experimental</strong><p>This prototype uses WebRTC and a public STUN server, so it still needs internet access to establish calls. It does not yet provide zero-data calling, automatic ringing, or reliable worldwide connectivity. No call server or TURN relay is configured.</p></div></section>

      <section className="principles">
        <div><span className="principle-icon">⌁</span><h3>Channel first</h3><p>Test whether real audio can travel between devices before expanding the dialler.</p></div>
        <div><span className="principle-icon">◇</span><h3>Privacy by design</h3><p>Connection codes can contain network details. Share them only with the intended person.</p></div>
        <div><span className="principle-icon">◎</span><h3>No false promises</h3><p>We'll only claim free offline calling after the transport is proven on real phones.</p></div>
      </section>
      <footer><a className="brand footer-brand" href={process.env.PUBLIC_URL || "/"}><span className="brand-mark">L</span><span>letify</span></a><span>Built for connection. Tested with honesty.</span><span>EARLY EXPERIMENT · NOT FOR EMERGENCY CALLS</span></footer>
    </main>
  );
}

export default App;
