import React, {useEffect} from "react";

const VideoRemote = ({ feeds, remoteusers }) => {
  // Función auxiliar para encontrar al usuario por ID Janus
  console.log("xue *-*-*")

  console.log("🟦 feeds initial:", feeds);
  console.log("🟧 remoteusers initial:", remoteusers);
  useEffect(() => {
    console.log("🟦 feeds updated:", feeds);
  }, [feeds]);

  useEffect(() => {
    console.log("🟧 remoteusers updated:", remoteusers);
  }, [remoteusers]);


  const getUserByJanusId = (feedId) => {
    console.log("feeds " + feeds)
    console.log("remoteusers " + remoteusers)
    return remoteusers.find((user) => user.id_janus === feedId);
  };

  return (
    <>
      {feeds.map((f) => {
        const user = getUserByJanusId(f.feedId);
        console.log("user xue: ", user)
        const micOn = user?.status_microphone;
        const micLock = user?.microphone;
        const userName = user?.name || "Desconocido";
        const cameraStatus = user?.status_video;
        const cameraLock = user?.video;

        return (
          <div
            key={f.feedId}
            style={{
              position: "relative",
              display: "inline-block",
              margin: "5px",
            }}
          >
            {/* Etiqueta de usuario */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                backgroundColor: "rgba(0, 0, 255, 0.7)",
                color: "white",
                padding: "2px 6px",
                fontSize: "12px",
                borderBottomRightRadius: "4px",
                zIndex: 10,
              }}
            >
              <div><strong>Name: {userName}</strong></div>
              <div>ID: {f.feedId}</div>
              <div>
                {micOn ? "🎤 Mic encendido" : "🔇 Mic apagado"} / 
                {micLock ? "🔒 Mic unlocked" : "🔓 Mic locked"}
              </div>
              <div>
                {cameraStatus ? "🚫📷 Desactivar cámara" : "📷 Activar cámara"} / 
                {cameraLock ? "🔒 Cam unlocked" : "🔓 Cam locked"}
              </div>
            </div>

            {/* Video remoto */}
            <video
              ref={f.ref}
              autoPlay
              playsInline
              style={{
                width: "320px",
                border: "2px solid blue",
              }}
            />
          </div>
        );
      })}
    </>
  );
};

export default VideoRemote;

