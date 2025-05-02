"use client";

import { QRCodeCanvas } from "qrcode.react";

interface GenerateQrCodeProps {
  roomCode: string;
}

function GenerateQrCode({ roomCode }: GenerateQrCodeProps) {
  if (!roomCode) return <div>Loading...</div>;

  const baseUrl = window.location.origin; 
  const qrValue = `${baseUrl}/${roomCode}`;

  return (
    <div style={{ cursor: "pointer", width: "fit-content" }}>
      <QRCodeCanvas
        value={qrValue}
        size={108}
        bgColor="#000000"
        fgColor="#ffffff"
      />
    </div>
  );
}

export default GenerateQrCode;
