"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";

interface GenerateQrCodeProps {
  redisKey: string;
}

function GenerateQrCode({ redisKey }: GenerateQrCodeProps) {
  const [roomCode, setRoomCode] = useState<string>("");

  useEffect(() => {
    async function fetchRoomCode() {
      try {
        const res = await axios.get(`/api/redis/${redisKey}`);
        if (res.data && res.data.roomCode) {
          setRoomCode(res.data.roomCode);
        } else {
          setRoomCode("room1");
        }
      } catch (error) {
        console.error("Failed to fetch roomCode:", error);
        setRoomCode("room1");
      }
    }

    fetchRoomCode();
  }, [redisKey]);

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
