import React, { useEffect, useRef, useState } from "react";
import Janus from "janus-gateway";
import adapter from "webrtc-adapter";
window.adapter = adapter;

const JanusTest = () => {
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const [janusInitialized, setJanusInitialized] = useState(false);
  const [remoteFeeds, setRemoteFeeds] = useState([]);
  const [currentSubstream, setCurrentSubstream] = useState(0);
  const currentRemoteSubstreamRef = useRef(currentSubstream);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    Janus.init({ debug: "all", callback: () => setJanusInitialized(true) });
  }, []);

  useEffect(() => {
    if (!janusInitialized) return;
    janusRef.current = new Janus({
      server: "wss://webrtc.testlorotest.xyz:8989/janus",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      success: attachPlugin,
    });
  }, [janusInitialized]);

  const attachPlugin = () => {
    janusRef.current.attach({
      plugin: "janus.plugin.videoroom",
      success: (pluginHandle) => {
        pluginHandleRef.current = pluginHandle;
        pluginHandle.send({
          message: {
            request: "join",
            room: 1234,
            ptype: "publisher",
            display: isMobile ? "mobile" : "desktop",
          },
        });
      },
      onmessage: (msg, jsep) => {
        if (msg.videoroom === "joined") {
          startCamera();
          if (msg.publishers)
            msg.publishers.forEach((p) => newRemoteFeed(p.id));
        }
        if (msg.videoroom === "event") {
          if (msg.publishers)
            msg.publishers.forEach((p) => newRemoteFeed(p.id));
          if (msg.unpublished || msg.leaving) {
            const leavingId = msg.unpublished || msg.leaving;
            setRemoteFeeds((prev) => {
              const toRemove = prev.find((f) => f.feedId === leavingId);
              if (toRemove) toRemove.pluginHandle.detach();
              return prev.filter((f) => f.feedId !== leavingId);
            });
          }
        }
        if (jsep) pluginHandleRef.current.handleRemoteJsep({ jsep });
      },
      onlocaltrack: (track, on) => {
        if (on) {
          if (!localStreamRef.current) localStreamRef.current = new MediaStream();
          localStreamRef.current.addTrack(track);
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      },
    });
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;

    const tracks = stream.getTracks().map((track) => ({
      type: track.kind,
      capture: true,
      recv: false,
      simulcast: track.kind === "video" && !isMobile,
      ...(track.kind === "video" && !isMobile && {
        sendEncodings: [
          { rid: "m", active: true, maxBitrate: 1200000 },
          { rid: "l", active: true, maxBitrate: 600000 },
          { rid: "h", active: true, maxBitrate: 3000000 },
        ],
      }),
    }));

    pluginHandleRef.current.createOffer({
      stream,
      tracks,
      trickle: true,
      success: async (jsep) => {
        // 👈 Aquí aplicamos sendEncodings a nivel RTCRtpSender
        const pc = pluginHandleRef.current.webrtcStuff.pc;
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (videoSender && !isMobile) {
          const parameters = videoSender.getParameters();
          parameters.encodings = [
            { rid: "m", active: true, maxBitrate: 1200000 },
            { rid: "l", active: true, maxBitrate: 600000 },
            { rid: "h", active: true, maxBitrate: 3000000 },
          ];
          await videoSender.setParameters(parameters);
          console.log("✅ Simulcast encodings seteados correctamente en RTCRtpSender");
        } // Aquí aplicamos sendEncodings a nivel RTCRtpSender

        pluginHandleRef.current.send({
          message: { request: "configure", audio: true, video: true },
          jsep,
        });
      },
    });
  };


  const shareScreen = async () => {
    if (isMobile) return alert("Compartir pantalla no disponible en móviles.");
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    
    // Crear un stream local solo con ese track para visualizarlo localmente
    const displayStream = new MediaStream([screenTrack]);
    localVideoRef.current.srcObject = displayStream;

    // Reemplazar en la conexión a Janus
    const sender = pluginHandleRef.current.webrtcStuff.pc.getSenders().find(
      (s) => s.track && s.track.kind === "video"
    );
    if (sender) await sender.replaceTrack(screenTrack);

    screenTrack.onended = () => {
    pluginHandleRef.current.send({ message: { request: "unpublish" } });
    pluginHandleRef.current.hangup();
    pluginHandleRef.current.detach();
    
    setTimeout(() => {
      attachPlugin(); // ← volver a conectar un nuevo plugin publisher
    }, 500);

    };
  };


  const newRemoteFeed = (publisherId) => {
    if (remoteFeeds.find((f) => f.feedId === publisherId)) return;
    janusRef.current.attach({
      plugin: "janus.plugin.videoroom",
      success: (pluginHandle) => {
        pluginHandle.send({
          message: { request: "join", room: 1234, ptype: "subscriber", feed: publisherId },
        });

        pluginHandle.onremotetrack = (track, mid, on) => {
          if (!on) return;
          setRemoteFeeds((prev) => {
            const exists = prev.find((f) => f.feedId === publisherId);
            if (exists) {
              exists.stream.addTrack(track);
              return [...prev];
            }
            const stream = new MediaStream([track]);
            const ref = React.createRef();
            return [...prev, { feedId: publisherId, stream, ref, pluginHandle }];
          });
        };

        pluginHandle.onmessage = (msg, jsep) => {
          if (jsep) {
            pluginHandle.createAnswer({
              jsep,
              tracks: [
                { type: "audio", capture: true, recv: true },
                { type: "video", capture: true, recv: true },
              ],
              success: (jsepAnswer) => {
                pluginHandle.send({ message: { request: "start" }, jsep: jsepAnswer });
                pluginHandle.send({ message: { request: "configure", substream: currentRemoteSubstreamRef.current } });
              },
            });
          }
        };
      },
    });
  };

  const switchQuality = (substream) => {
    setCurrentSubstream(substream);
    remoteFeeds.forEach((f) => {
      f.pluginHandle.send({ message: { request: "configure", substream } });
    });
  };

  const configurePublisher = (audio, video) => {
    pluginHandleRef.current.send({ message: { request: "configure", audio, video } });
  };

  useEffect(() => {
    remoteFeeds.forEach((f) => {
      if (f.ref.current) f.ref.current.srcObject = f.stream;
    });
  }, [remoteFeeds]);

  useEffect(() => {
    currentRemoteSubstreamRef.current = currentSubstream;
  }, [currentSubstream]);


  return (
    <div>
      <h2>🎥 Janus VideoRoom React</h2>
      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "480px", border: "2px solid green" }} />
      <div>
        <button onClick={() => configurePublisher(false, true)}>Mute Mic</button>
        <button onClick={() => configurePublisher(true, true)}>Unmute Mic</button>
        <button onClick={() => configurePublisher(true, false)}>Apagar Cámara</button>
        <button onClick={() => configurePublisher(true, true)}>Encender Cámara</button>
        <button onClick={shareScreen}>📺 Compartir Pantalla</button>
      </div>
      <h3>👥 Participantes Remotos</h3>
      <div>
        <strong>📶 Calidad remota:</strong>
        <select value={currentSubstream} onChange={(e) => switchQuality(parseInt(e.target.value))}>
          <option value="0">Media</option>
          <option value="1">Baja</option>
          <option value="2">Alta</option>
        </select>
      </div>
      {remoteFeeds.map((f) => (
        <div key={f.feedId}>
          <video ref={f.ref} autoPlay playsInline style={{ width: "320px", border: "2px solid blue", margin: "5px" }} />
        </div>
      ))}
    </div>
  );
};

export default JanusTest;
