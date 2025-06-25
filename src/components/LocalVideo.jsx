import React, { useEffect, useRef } from 'react';

const LocalVideo = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("No se pudo acceder a la cámara: ", err);
      });
  }, []);

  return (
    <video ref={videoRef} autoPlay playsInline muted style={{ width: '400px' }} />
  );
};

export default LocalVideo;

