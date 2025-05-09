import { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface GenerateQrCodeProps {
  roomCode: string;
  isDarkMode?: boolean;
}

function GenerateQrCode({ roomCode, isDarkMode = false }: GenerateQrCodeProps) {
  const [url, setUrl] = useState<string>("");
  
  // Get colors based on theme
  const getQRColors = useCallback(() => {
    if (isDarkMode) {
      return {
        bgColor: "#53354A", // quaternary-color in dark mode
        fgColor: "#EBEBD3", // tertiary-color in dark mode
      };
    }
    return {
      bgColor: "#FBFFF1", // quaternary-color in light mode
      fgColor: "#1E1E1E", // tertiary-color in light mode
    };
  }, [isDarkMode]);
  
  const { bgColor, fgColor } = getQRColors();
  
  useEffect(() => {
    if (!roomCode) return;
    
    const origin = window.location.origin;
    const joinUrl = `${origin}/join/${roomCode}`;
    setUrl(joinUrl);
  }, [roomCode]);

  if (!roomCode) return <div>Loading...</div>;

  if (!url) return <div>Generating QR Code...</div>;

  return (
    <div style={{ cursor: "pointer", width: "fit-content" }}>
      <QRCodeCanvas
        value={url}
        size={108}
        bgColor={bgColor}
        fgColor={fgColor}
        level="L"
      />
    </div>
  );
}

export default GenerateQrCode;
