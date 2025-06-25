
import React, { useEffect, useRef, useState } from "react";
import Janus from "janus-gateway";
import adapter from "webrtc-adapter";
window.adapter = adapter;

const JanusTest = () => {
  const janusRef = useRef(null);
  const videoRoomPluginRef = useRef(null);
  const localVideoRef = useRef(null);
  const [janusInitialized, setJanusInitialized] = useState(false);
  const [remoteFeeds, setRemoteFeeds] = useState([]); // { feedId, stream, ref }

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
      server: "wss://webrtc.testlorotest.xyz:8989/janus", // Cambiar si es necesario
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
              console.log('xue: ', msg.id)
              if (msg.publishers) {
                console.log("Conactados previamente xue")
                console.log(msg.publishers)
                msg.publishers.forEach((p) => {
                  newRemoteFeed(p.id);
                });
              }
            }

            if (msg.videoroom === "event" && msg.publishers) {
              console.log("📡 Nuevos publishers detectados xue:", msg.publishers);
              msg.publishers.forEach((p) => {
                newRemoteFeed(p.id);
              });
            }

            // Limpiar si un usuario se desconecta
            if (msg.videoroom === "event" && (msg.unpublished || msg.leaving)) {
              const leavingId = msg.unpublished || msg.leaving;
              console.log("❌ Remover feed remoto:", leavingId);

              setRemoteFeeds((prev) =>
                prev.filter((feed) => feed.feedId !== leavingId)
              );
            }

            if (jsep) {
              videoRoomPluginRef.current.handleRemoteJsep({ jsep });
            }
          },

          onlocaltrack: (track, on) => {
            if (on && track.kind === "video") {
              const stream = new MediaStream([track]);
              localVideoRef.current.srcObject = stream;
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
      { type: "audio", capture: true, recv: false },
      { type: "video", capture: true, recv: false },
    ];

    videoRoomPluginRef.current.createOffer({
      tracks,
      trickle: false,
      success: (jsep) => {
        videoRoomPluginRef.current.send({
          message: { request: "configure", audio: true, video: true },
          jsep,
        });
      },
    });
  };

  // Manejar la llegada de un nuevo feed remoto
  const newRemoteFeed = (publisherId) => {
    let remoteHandle = null;

    janusRef.current.attach({
      plugin: "janus.plugin.videoroom",
      success: (pluginHandle) => {
        remoteHandle = pluginHandle;

        remoteHandle.send({
          message: {
            request: "join",
            room: 1234,
            ptype: "subscriber",
            feed: publisherId,
          },
        });
      },

      onmessage: (msg, jsep) => {
        console.log("Mensaje en newRemoteFeed xue", msg)
        if (jsep) {
          console.log("remote onmessage xue JSEP ", jsep )
          console.log("remote onmessage xue JSEP.sdp ", jsep.sdp )
          remoteHandle.createAnswer({
            jsep,
            tracks: [{ type: "audio", recv: true }, { type: "video", recv: true }],
            trickle: false,
            success: (jsepAnswer) => {
              remoteHandle.send({
                message: { request: "start" },
                jsep: jsepAnswer,
              });
            },
          });
        }
      },

      ontrack: (track, on) => {
        console.log("ontrack xue: ", track, on)
        if (on && track.kind === "video") {
          const stream = new MediaStream([track]);
          const ref = React.createRef();
          console.log("almacenamiento de video remoto xue")
          setRemoteFeeds((prev) => [...prev, { feedId: publisherId, stream, ref }]);
        }
      },
    });
  };

  // Asignar streams a sus videos
  useEffect(() => {
    console.log("ingreso useEffect de remoteFeeds xue")
    remoteFeeds.forEach((feed) => {
      if (feed.ref.current) {
        feed.ref.current.srcObject = feed.stream;
      }
    });
  }, [remoteFeeds]);

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

      <h3>👥 Participantes Remotos</h3>
      {remoteFeeds.map((feed, idx) => (
        <video
          key={feed.feedId}
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

