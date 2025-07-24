import React, { useEffect, useRef, useState } from "react";
import Janus from "janus-gateway";
import adapter from "webrtc-adapter";
import {useMeetSocket} from "../hooks/useMeetSocket";
import VideoRemote from "./remoteVideo";
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
  
  const [socketReady, setSocketReady] = useState(false); 
  

  const [meetIdUser, setMeetIdUser] = useState('');
  const [tokenUser, setTokenUser] = useState('');


  const [remoteUsers, setRemoteUsers] = useState([])
  const [currentUser, setCurrentUser] = useState({})

  // provisional
  const meetId = useRef('33123b53-3bfb-4c19-8559-90e89f467b2e')
  //rafaelromariorv@gmail.com
  const tokenUserOne = useRef('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0MTcwMzMzLCJpYXQiOjE3NTMzMDYzMzMsImp0aSI6IjgwNDJjYmI5MmUxZDRlODliZGZlZmUzZjE1OTIwODkwIiwidXNlcl9pZCI6ImQ2OWE1YzU1LTgxZjctNDlmMS1iZGY0LTM0ZGQ5MTQxOGRhMiJ9.7EVdPl8zYl47zlJCdSunnNaBOmpmQdD4T3H5zYEgV_I')
  //Fabian
  const tokenUserTwo = useRef('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0MTcwNDA0LCJpYXQiOjE3NTMzMDY0MDQsImp0aSI6ImVmMTIyZTYxMWQ3NDRiYWFhYzA3MGEyNGIzMmYyNDQ0IiwidXNlcl9pZCI6ImM2ZTNkOTIzLWQxNGQtNDYwYi1iYWY5LTcxMzIwOWRjNmZmMyJ9.vKR6WePEC_J7sXDqCnwY0Q2Vr0xGCAMcS5-EL_8oL54')



  const handleUserConnect = (data) => {
    if (data && data.data) {
      console.log("connected user ", data.data);
      setCurrentUser(data.data);
      sendMessage({"type":"users"})
    } else {
      console.warn("Invalid user data received", data);
    }
  }


  const handleUserDisconnect = (data) => {
    console.log("handleUserDisconnect")
    setRemoteUsers(prevRemote => {
      const update = prevRemote.filter(user => user.id_user !== data.data.id_user);
      console.log("handleUserDisconnect:", update);
      return update;
    });
  }


  const addIdJanusToSocket = (id_janus) => {
    setCurrentUser(prev => ({
      ...prev,
      id_janus: id_janus 
    }));
    sendMessage({
      "type": "add_id_janus",
      "id_janus": id_janus
    })
  };



  const handleNewUserConnect = (data) => {
    setRemoteUsers(prevRemote => {
        const existingUser = prevRemote.find(user => user.id_user === data.data.id_user);
        if (!existingUser) {
            console.log("Add new socket user remote");
            const update = [...prevRemote, data.data];
            console.log("handleNewUserConnect: ", update)
            return update
        }
        return prevRemote;
      });
  }




  const handleChangeStatus = (data) => {
    const updatedUser = data.data;

    setRemoteUsers(prevUsers =>
      prevUsers.map(user =>
        user.id_user === updatedUser.id_user ? { ...user, ...updatedUser } : user
      )
    );
  };


  const handleAddPreviousUsers = (data) => {
    setRemoteUsers(data.data)
  }


  const socketHandlers = {
    "user_connect": handleUserConnect,
    "user_disconnect": handleUserDisconnect,
    "new_user_connect": handleNewUserConnect,
    "add_id_janus": handleChangeStatus,
    "change_status": handleChangeStatus,
    "users": handleAddPreviousUsers,
  };


  const handleSocketMessage = (data) => {
    console.log("🔸 Mensaje desde backend:", data);
    if (!data?.type) {
      console.warn("⚠️ Messaje receive without type valid:", data);
      return;
    }

    const handler = socketHandlers[data.type];
    if (handler) {
      handler(data);
    } else {
      console.warn("❓ Type no handle:", data.type);
    }
  };




  const disconnectAll = () => {
    console.log("🔌 Desconectando usuario...");

    // Cerrar el socket
    closeSocket();

    // Cerrar Janus si está conectado
    if (pluginHandleRef.current) {
      pluginHandleRef.current.send({ message: { request: "unpublish" } });
      pluginHandleRef.current.hangup();
      pluginHandleRef.current.detach();
      pluginHandleRef.current = null;
    }

    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }

    // Limpieza de estado local
    setRemoteFeeds([]);
    setRemoteUsers([]);
    setCurrentUser({});
    setJanusInitialized(false);
    setSocketReady(false);
    setMeetIdUser('');
    setTokenUser('');
  };



  const { connectSocket, sendMessage, closeSocket, isSocketConnect } = useMeetSocket({
    //meetId: meetId.current,
    //token: token.current,
    meetId: meetIdUser,
    token: tokenUser,
    onMessage: handleSocketMessage,
    onOpen: () => {
      console.log("🔗 Socket Django listo")
      setSocketReady(true);
    },
    onClose: () => {
      console.log("Socket cerrado, cerrando Janus ...");
    },
    localVideoRef,
    
  });




  useEffect(() => {
    if (socketReady && !janusInitialized) {
      Janus.init({ debug: "all", callback: () => setJanusInitialized(true) });
    }
  }, [socketReady]);

  useEffect(() => {
    if (!janusInitialized) return;
    janusRef.current = new Janus({
      server: "wss://webrtc.testlorotest.xyz:8989/janus",
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      success: attachPlugin,
    });

    return () => {
      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }
    };


  }, [janusInitialized]);

  const attachPlugin = () => {
    janusRef.current.attach({
      plugin: "janus.plugin.videoroom",
      success: (pluginHandle) => {
        pluginHandleRef.current = pluginHandle;
        console.log("xue: ", pluginHandle.id)
        
        const roomId = meetIdUser;  // <-- aquí tu uuid dinámico desde props, state, url, etc.

        // 1️⃣ Consultar si la sala existe
        pluginHandle.send({
          message: { request: "exists", room: roomId },
          success: (result) => {
            if (result.exists) {
              console.log("✅ Sala ya existe, me uno.");
              joinRoom(roomId);
            } else {
              console.log("⚙️ Sala no existe, creando...");
              // 2️⃣ Crear sala
              pluginHandle.send({
                message: {
                  request: "create",
                  room: roomId,
                  description: "Sala dinámica",
                  publishers: 40,
                  bitrate: 3000000,
                  fir_freq: 10,
                  simulcast: true,
                },
                success: (createResult) => {
                  console.log("✅ Sala creada", createResult);
                  joinRoom(roomId);
                },
                error: (err) => {
                  console.error("❌ Error creando sala:", err);
                },
              });
            }
          },
          error: (err) => {
            console.error("❌ Error consultando sala:", err);
          },
        });
      },
      onmessage: (msg, jsep) => {
        if (msg.videoroom === "joined") {
          startCamera();
          // Este es id del actual
          addIdJanusToSocket(msg.id)
          if (msg.publishers){
            msg.publishers.forEach((p) => newRemoteFeed(p.id));
          }
        }
        if (msg.videoroom === "event") {
          console.log("xue desp: ", msg)
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


  const joinRoom = (roomId) => {
    pluginHandleRef.current.send({
      message: {
        request: "join",
        room: roomId,
        ptype: "publisher",
        display: isMobile ? "mobile" : "desktop",
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
          message: { request: "join", room: meetIdUser, ptype: "subscriber", feed: publisherId },
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

  const configurePublisherVideo = (video) => {
    pluginHandleRef.current.send({ message: { request: "configure", video } });
    sendMessage({"type": "change_status", "action":"status_video", "new_status": video})
  //pluginHandleRef.current.send({ message: { request: "configure", audio, video } });
  };


  const configurePublisherVideoDinamic = () => {
    const newStatus = !currentUser.status_video;

    setCurrentUser(prev => ({
      ...prev,
      status_video: newStatus
    }));

    pluginHandleRef.current.send({ message: { request: "configure", video:newStatus } });
    sendMessage({"type": "change_status", "action":"status_video", "new_status": newStatus})
  };



  const configurePublisherAudioDinamic = () => {
    const newStatus = !currentUser.status_microphone;

    setCurrentUser(prev => ({
      ...prev,
      status_microphone: newStatus
    }));

    pluginHandleRef.current.send({ message: { request: "configure", audio:newStatus } });
    sendMessage({"type": "change_status", "action":"status_microphone", "new_status": newStatus})
  };


  const configurePublisherAudio = (audio) => {
    pluginHandleRef.current.send({ message: { request: "configure", audio } });
    sendMessage({"type": "change_status", "action":"status_microphone", "new_status": audio})
    
  };


  useEffect(() => {
    remoteFeeds.forEach((f) => {
      if (f.ref.current) f.ref.current.srcObject = f.stream;
    });
  }, [remoteFeeds]);

  useEffect(() => {
    currentRemoteSubstreamRef.current = currentSubstream;
  }, [currentSubstream]);

  const enterCredendials = () => {
    const meetVal = document.getElementById('meetIdUser').value;
    const tokenVal = document.getElementById('tokenUser').value;

    setMeetIdUser(meetVal);
    setTokenUser(tokenVal);

    // Muy importante: Conecta solo cuando tengas datos válidos
    if (meetVal && tokenVal) {
      connectSocket();
    } else {
      alert("Faltan datos para conectar.");
    }
  }

  const credentialsUser = (user) => {
    let meetVal = "";
    let tokenUseraux = "";
    setMeetIdUser(meetId.current);
    meetVal = meetId.current;
    if (user === "one") {
      console.log(user)
      tokenUseraux = tokenUserOne.current
      setTokenUser(tokenUserOne.current)
    }
    if (user === "two") {
      console.log(user)
      tokenUseraux = tokenUserTwo.current
      setTokenUser(tokenUserTwo.current)
    }
  

    if (meetVal && tokenUseraux) {
      connectSocket();
    } else {
      alert("Faltan datos para conectar.");
    }
  }

  return (
    <div>
      <h1>Credential test</h1>
      <label htmlFor="">meetIdUser</label>
      <input type="text" id="meetIdUser"/>
      <br/>
      <label htmlFor="">tokenUser</label>
      <input type="text" id="tokenUser"/>
      <br/>
      <button onClick={enterCredendials}>Enter credentials</button>
      <button onClick={ () => credentialsUser("one")}>Enter user 1</button>
      <button onClick={ () => credentialsUser("two")}>Enter user 2</button>
      <br/>
      <button onClick={disconnectAll}>❌ Desconectar</button>
      <h2>🎥 Janus VideoRoom React</h2>
      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "480px", border: "2px solid green" }} />
      <div>
        <button 
          onClick={() => configurePublisherAudioDinamic()}
          disabled={!currentUser.microphone}
        >
          {currentUser.status_microphone ? "🔇 Mutear Mic" : "🎤 Activar Mic"}
        </button>
        <button 
          onClick={() => configurePublisherVideoDinamic()}
          disabled={!currentUser.video}
        >
          {currentUser.status_video ? "🚫📷 Desactivar cámara" : "📷 Activar cámara"}
        </button>
        <button onClick={() => configurePublisherAudio(false)}>Mute Mic</button>
        <button onClick={() => configurePublisherAudio(true)}>Unmute Mic</button>
        <button onClick={() => configurePublisherVideo(false)}>Apagar Cámara</button>
        <button onClick={() => configurePublisherVideo(true)}>Encender Cámara</button>
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

      <VideoRemote feeds={remoteFeeds} remoteusers={remoteUsers} ></VideoRemote>



    </div>
  );
};

export default JanusTest;
