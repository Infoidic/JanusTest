import React, {useEffect} from "react";

const VideoRemote = ({ feeds, remoteusers, onRemoteAction }) => {
  // Función auxiliar para encontrar al usuario por ID Janus

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
        const channelName = user?.channel_name;
        const statusMicrophone = user?.status_microphone;
        const microphone = user?.microphone;
        const userName = user?.name || "Desconocido";
        const statusVideo = user?.status_video;
        const video = user?.video;
        const statusScree = user?.status_screen;
        const screen = user?.screen;
        console.log("xue f : ", f)
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

            <div
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "white",
                padding: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomLeftRadius: "8px",
                borderBottomRightRadius: "8px",
              }}
              >
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => 
                    onRemoteAction({
                      type:"change_status_user_meet",
                      action: "microphone",
                      new_status:!microphone,
                      channel_name: channelName
                    })
                  }
                >
                  {statusMicrophone ? "🎤" : "🔇"} / 
                  {microphone ? "🔒🟢" : "🔓🚫"}
                </button>
                <button 
                  onClick={() => 
                    onRemoteAction({
                      type:"change_status_user_meet",
                      action: "video",
                      new_status:!video,
                      channel_name: channelName
                    })
                  }
                >
                  {statusVideo ? "📷" : "📷🚫"} / 
                  {video ? "🔒🟢" : "🔓🚫"}
                </button>
                <button
                  onClick={() => 
                    onRemoteAction({
                      type:"change_status_user_meet",
                      action: "screen",
                      new_status:!screen,
                      channel_name: channelName
                    })
                  }
                >
                  {statusScree ? "🖥️" : "🖥️🚫"} / 
                  {screen ? "🔒🟢" : "🔓🚫"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default VideoRemote;

