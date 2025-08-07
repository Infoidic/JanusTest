import React, {useEffect} from "react";

const VideoRemote = ({ feeds, currentusers, onRemoteAction }) => {


  useEffect(() => {
    console.log("🔍 feeds recibidos en VideoRemote:", feeds);
  }, [feeds]);

  return (
    <>
      {feeds.map((f) => {
        //const userName = user?.name || "Desconocido";
        console.log("xue f : ", f)
        //if (f.feedId === currentusers.id_janus_share_screen) return null;
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
              <div><strong>Name: {f.data?.name || "Desconocido"} </strong></div>
              <div>ID: {f.feedId}</div>
              <div>Display: {f.display}</div>
              
            </div>

            {/* Video remoto */}
            <video
              ref={f.ref}
              autoPlay
              playsInline
              style={{
                width: "700px",
                border: "2px solid blue",
              }}
            />

            <div
              style={f.data !== null ?{
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
              }: undefined}
              >
              <div 
                style={f.data !== null ? { display: "flex", gap: "8px" } : undefined}
              >
                <button 
                  onClick={() => 
                    onRemoteAction({
                      type:"change_status_user_meet",
                      action: "microphone",
                      new_status:!f.data.microphone,
                      channel_name: f.data?.channel_name
                    })
                  }
                  hidden={f.data === null}
                >
                  {f.data?.status_microphone ? "🎤" : "🔇"} / 
                  {f.data?.microphone ? "🔒🟢" : "🔓🚫"}
                </button>
                <button 
                  onClick={() => 
                    onRemoteAction({
                      type:"change_status_user_meet",
                      action: "video",
                      new_status:!f.data?.video,
                      channel_name: f.data?.channel_name
                    })
                  }
                  hidden={f.data === null}
                >
                  {f.data?.status_video ? "📷" : "📷🚫"} / 
                  {f.data?.video ? "🔒🟢" : "🔓🚫"}
                </button>
                <button
                  onClick={() => 
                    onRemoteAction({
                      type:"change_status_user_meet",
                      action: "screen",
                      new_status:!f.data.screen,
                      channel_name: f.data.channel_name
                    })
                  }
                  hidden={f.data === null}
                >
                  { f.data?.status_screen ? "🖥️" : "🖥️🚫"} / 
                  {f.data?.screen ? "🔒🟢" : "🔓🚫"}
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

