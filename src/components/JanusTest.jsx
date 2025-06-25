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
  const remoteFeedIdsRef = useRef([]);
  const localStreamRef = useRef(new MediaStream());

  // Inicializa Janus
  useEffect(() => {
    Janus.init({
      debug: "all",
      callback: () => {
        console.log("✅ Janus.init completado");
        setJanusInitialized(true);
      },
    });
  }, []);

  // Conexión con Janus
  useEffect(() => {
    if (!janusInitialized) return;

    janusRef.current = new Janus({
      server: "wss://webrtc.testlorotest.xyz:8989/janus",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      success: () => {
        console.log("✅ Conectado a Janus");

        janusRef.current.attach({
          plugin: "janus.plugin.videoroom",
          success: (pluginHandle) => {
            console.log("✅ Plugin videoroom conectado");
            videoRoomPluginRef.current = pluginHandle;

            pluginHandle.send({
              message: {
                request: "join",
                room: 1234,
                ptype: "publisher",
                display: "yo",
              },
            });
          },

          onmessage: (msg, jsep) => {
            console.log("📨 Mensaje recibido:", msg);

            if (msg.videoroom === "joined") {
              publishOwnFeed();
              if (msg.publishers) {
                msg.publishers.forEach((p) => {
                  newRemoteFeed(p.id);
                });
              }
            }

            if (msg.videoroom === "event" && msg.publishers) {
              msg.publishers.forEach((p) => {
                newRemoteFeed(p.id);
              });
            }

            if (msg.videoroom === "event" && (msg.unpublished || msg.leaving)) {
              const leavingId = msg.unpublished || msg.leaving;
              setRemoteFeeds((prev) =>
                prev.filter((feed) => feed.feedId !== leavingId)
              );
            }

            if (jsep) {
              videoRoomPluginRef.current.handleRemoteJsep({ jsep });
            }
          },

          onlocaltrack: (track, on) => {
            //if (on && track.kind === "video") {
            //  const stream = new MediaStream([track]);
            //  localVideoRef.current.srcObject = stream;
            //  localVideoRef.current.play();
            //}
            if (on) {
              localStreamRef.current.addTrack(track) 
              //const stream = new MediaStream([track]);
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.play();
            }
          },
        });
      },
    });
  }, [janusInitialized]);

  // Publicar nuestra propia cámara/micrófono
  const publishOwnFeed = () => {
    const tracks = [
      { 
        type: "audio", 
        capture: true, 
        recv: false,
        sendEncodings: [
          { rid: "h", active: true, maxBitrate: 500000 },  // alta
          { rid: "m", active: true, maxBitrate: 250000 },  // media
          { rid: "l", active: true, maxBitrate: 100000 },  // baja
        ],
      },
      { type: "video", capture: true, recv: false },
    ];

    videoRoomPluginRef.current.createOffer({
      tracks,
      trickle: true,
      success: (jsep) => {
        videoRoomPluginRef.current.send({
          message: { request: "configure", audio: true, video: true },
          jsep,
        });
      },
    });
  };

  // Manejar un nuevo feed remoto
  const newRemoteFeed = (publisherId) => {
    console.log("ENTRO")

    janusRef.current.attach({
      plugin: "janus.plugin.videoroom",
      success: (pluginHandle) => {
        pluginHandle.send({
          message: {
            request: "join",
            room: 1234,
            ptype: "subscriber",
            feed: publisherId,
          },
        });



        // dentro de pluginHandle.onremotetrack
        pluginHandle.onremotetrack = (track, mid, on) => {
          console.log("📡 onremotetrack recibido xue", track.kind, on);
          if (!on) return;

          setRemoteFeeds((prev) => {
            const existingFeedIndex = prev.findIndex((f) => f.feedId === publisherId);

            if (existingFeedIndex !== -1) {
              const updatedFeeds = [...prev];
              updatedFeeds[existingFeedIndex].stream.addTrack(track);
              return updatedFeeds;
            } else {
              const stream = new MediaStream([track]);
              const ref = React.createRef();
              return [...prev, { feedId: publisherId, stream, ref }];
            }
          });
        };




        pluginHandle.onmessage = (msg, jsep) => {
          if (jsep) {
            pluginHandle.createAnswer({
              jsep,
              tracks: [{ type: "audio", capture:true, recv: true }, { type: "video", capture:true, recv: true }],
              trickle: true,
              success: (jsepAnswer) => {
                pluginHandle.send({
                  message: { request: "start" },
                  jsep: jsepAnswer,
                });
              },
            });
          }
        };
      },
    });
  };

  // Asignar streams remotos a sus elementos de video
  useEffect(() => {
    remoteFeeds.forEach((feed) => {
      if (feed.ref.current) {
        feed.ref.current.srcObject = feed.stream;
      }
    });
  }, [remoteFeeds]);



  // actions 

  const configurePublisher = (audioEnabled, videoEnabled) => {
    if (videoRoomPluginRef.current) {
      console.log("xue configurePublisher audio: ", audioEnabled, " *-*-*- ", videoEnabled)
      videoRoomPluginRef.current.send({
        message: {
          request: "configure",
          audio: audioEnabled,
          video: videoEnabled,
        },
      });
      console.log(`Configurado: audio ${audioEnabled}, video ${videoEnabled}`);


    }
  };


  return (
    <div>
      <h2>🎥 Janus VideoRoom React</h2>

      <h3>📷 Mi cámara</h3>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "480px", border: "2px solid green" }}
      />
      <h3>🎛️ Controles</h3>

      <button onClick={() => configurePublisher(false, true)}>🔇 Mute Mic</button>
      <button onClick={() => configurePublisher(true, true)}>🎙️ Unmute Mic</button>
      <button onClick={() => configurePublisher(true, false)}>📷 Apagar Cámara</button>
      <button onClick={() => configurePublisher(true, true)}>📸 Encender Cámara</button>



      <h3>👥 Participantes Remotos</h3>
      <button onClick={() => console.log("📺 remoteFeeds actuales:", remoteFeeds)}>
        📋 Ver remoteFeeds en consola
      </button>
      {remoteFeeds.map((feed) => (
        <video
          key={`${feed.feedId}-${feed.ref.current ? 'loaded' : 'pending'}`}
          ref={feed.ref}
          autoPlay
          playsInline
          style={{ width: "320px", border: "2px solid blue", margin: "5px" }}
        />
      ))}



    </div>
  );
};

export default JanusTest;

