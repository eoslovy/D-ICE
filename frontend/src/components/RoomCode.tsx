interface RoomCodeProps {
    code: string
  }
  
  export default function RoomCode({ code }: RoomCodeProps) {
    return (
      <div className="mb-6">
        <div className="text-m font-medium mb-6 text-center">Room Code</div>
        <div className="room-code">{code}</div>
      </div>
    );
  }
  