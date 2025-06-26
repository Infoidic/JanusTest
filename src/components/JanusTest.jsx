import React, { useEffect, useRef, useState } from "react";
import Janus from "janus-gateway";
import adapter from "webrtc-adapter";
window.adapter = adapter;

const JanusTest = () => {
  const janusRef = useRef(null);
  const videoRoomPluginRef = useRef(null);
  const localVideoRef = useRef(null);
  const [janusInitialized, setJanusInitialized] = useState(false);
  const [remoteFeeds, setRemoteFeeds] = useState([]);
  const localStreamRef = useRef(new MediaStream());
  const [currentRemoteSubstream, setCurrentRemoteSubstream] = useState(0);
  const currentRemoteSubstreamRef = useRef(currentRemoteSubstream);

  useEffect(() => {
    Janus.init({ debug: "all", callback: () => setJanusInitialized(true) });
  }, []);

  useEffect(() => {
    if (!janusInitialized) return;

    janusRef.current = new Janus({
      server: "wss://webrtc.testlorotest.xyz:8989/janus",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      success: () => {
        janusRef.current.attach({
          plugin: "janus.plugin.videoroom",
          success: (pluginHandle) => {
            videoRoomPluginRef.current = pluginHandle;
            pluginHandle.send({ message: { request: "join", room: 1234, ptype: "publisher", display: "yo" } });
          },
          onmessage: (msg, jsep) => {
            if (msg.videoroom === "joined") publishOwnFeed();
            if (msg.publishers) msg.publishers.forEach((p) => newRemoteFeed(p.id));
            if (msg.videoroom === "event" && (msg.unpublished || msg.leaving)) {
              const leavingId = msg.unpublished || msg.leaving;
              removeRemoteFeed(leavingId);
            }
            if (jsep) videoRoomPluginRef.current.handleRemoteJsep({ jsep });
          },
          onlocaltrack: (track, on) => {
            if (on) {
              localStreamRef.current.addTrack(track);
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.play();
            }
          },
        });
      },
    });
  }, [janusInitialized]);

  const publishOwnFeed = () => {
    videoRoomPluginRef.current.createOffer({
      tracks: [
        { type: "audio", capture: true, recv: false },
        { type: "video", capture: true, recv: false, 
          simulcast: true, // si se commenta este va por estandard full
          sendEncodings: [ // si se commenta este va por estandard full
            // va leer siempre el primero y ese es el valor de select
            { rid: "m", active: true, maxBitrate: 1200000 },  // Media
            { rid: "l", active: true, maxBitrate: 100000 },  // Baja podria estar en 600000
            { rid: "h", active: true, maxBitrate: 2500000 }, // Alta
          ]
        },
      ],
      success: (jsep) => {
        videoRoomPluginRef.current.send({ message: { request: "configure", audio: true, video: true }, jsep });
      },
    });
  };

  const newRemoteFeed = (publisherId) => {
    janusRef.current.attach({
      plugin: "janus.plugin.videoroom",
      success: (pluginHandle) => {
        pluginHandle.send({ message: { request: "join", room: 1234, ptype: "subscriber", feed: publisherId } });
        pluginHandle.onremotetrack = (track, mid, on) => {
          if (!on) return;
          setRemoteFeeds((prev) => {
            const existing = prev.find((f) => f.feedId === publisherId);
            if (existing) {
              existing.stream.addTrack(track);
              return [...prev];
            } else {
              const stream = new MediaStream([track]);
              const ref = React.createRef();
              return [...prev, { feedId: publisherId, stream, ref, pluginHandle }];
            }
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

  const removeRemoteFeed = (feedId) => {
    setRemoteFeeds((prev) => {
      const feedToRemove = prev.find((f) => f.feedId === feedId);
      if (feedToRemove && feedToRemove.pluginHandle) feedToRemove.pluginHandle.detach();
      return prev.filter((f) => f.feedId !== feedId);
    });
  };

  const switchAllRemoteQualities = (substream) => {
    remoteFeeds.forEach((feed) => {
      if (feed.pluginHandle) {
        feed.pluginHandle.send({
          message: { request: "configure", substream },
        });
      }
    });
    setCurrentRemoteSubstream(substream)
    console.log(`📶 Calidad de todos los remotos cambiada a substream: ${substream}`);
  };

  const configurePublisher = (audio, video) => {
    videoRoomPluginRef.current.send({ message: { request: "configure", audio, video } });
  };

  useEffect(() => {
    remoteFeeds.forEach((feed) => {
      if (feed.ref.current) feed.ref.current.srcObject = feed.stream;
    });
  }, [remoteFeeds]);

  useEffect(() => {
    currentRemoteSubstreamRef.current = currentRemoteSubstream;
}, [currentRemoteSubstream]);


  return (
    <div>
      <h2>🎥 Janus VideoRoom React</h2>
      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "480px", border: "2px solid green" }} />
      <div>
        <button onClick={() => configurePublisher(false, true)}>Mute Mic</button>
        <button onClick={() => configurePublisher(true, true)}>Unmute Mic</button>
        <button onClick={() => configurePublisher(true, false)}>Apagar Cámara</button>
        <button onClick={() => configurePublisher(true, true)}>Encender Cámara</button>
      </div>

      <h3>👥 Participantes Remotos</h3>

      <div>
        <strong>📶 Calidad para todos:</strong>
        <select value={currentRemoteSubstream} onChange={(e) => switchAllRemoteQualities(parseInt(e.target.value))}>
          <option value="2">Alta</option>
          <option value="0">Media</option>
          <option value="1">Baja</option>
        </select>
      </div>

      {remoteFeeds.map((feed) => (
        <div key={feed.feedId}>
          <video ref={feed.ref} autoPlay playsInline style={{ width: "320px", border: "2px solid blue", margin: "5px" }} />
        </div>
      ))}
    </div>
  );
};

export default JanusTest;

