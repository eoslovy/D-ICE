import webSocketManager from "./WebSocketManager";
import {v7 as uuid} from "uuid";

const BASE_URL = "70.12.247.48"
const WS_URL = `ws://${BASE_URL}:8080/ws/game/user`;
const HTTP_URL = `http://${BASE_URL}:8080`;
let roomId = "wasted";

export default function WebSocketTest() {
  const handleConnect = () => {
    const id = uuid();
    const url = `${WS_URL}/${roomId}`;
    webSocketManager.setServerURL(url);
    webSocketManager.connect();
  };

  const handleDisconnect = () => {
    webSocketManager.disconnect();
  };

  const handleSendMessage = () => {
    const message = {
      type: "message",
      content: "Hello, WebSocket!",
      nickname: "TestUser",
    };
    webSocketManager.send(message);
  };

  const sendhttpRequest = () => {
    const url = `${HTTP_URL}/rooms`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      }
      )
      .then((data) => {
        console.log("HTTP Response:", data);
      }
      )
      .catch((error) => {
        console.error("HTTP Request failed:", error);
      }
      );
  }

  return (
    <div>
      <h1>WebSocket Test</h1>
      <input type="text" onChange={(e) => (roomId = e.target.value)} />
      <br/>
      <button onClick={handleConnect}>Connect</button>
      <button onClick={handleDisconnect}>Disconnect</button>
      <br/>
      <button onClick={handleSendMessage}>Send Message</button>
      <button onClick={sendhttpRequest}>Send HTTP Request</button>
    </div>
  );
}
