

import adapter from "webrtc-adapter";
window.adapter = adapter;

import React, { useEffect } from "react";
import Janus from "janus-gateway";

function JanusTest() {
  useEffect(() => {
    Janus.init({
      debug: "all",
      callback: () => {
        if (!Janus.isWebrtcSupported()) {
          alert("WebRTC no soportado");
          return;
        }

        const janus = new Janus({
          server: "ws://localhost:8188/",
          success: () => {
            console.log("Conectado a Janus!");
          },
          error: (error) => {
            console.error("Error en conexión Janus:", error);
          },
          destroyed: () => {
            console.log("Janus destruido");
          },
        });
      },
    });
  }, []);

  return <div>Conectando a Janus...</div>;
}

export default JanusTest;

