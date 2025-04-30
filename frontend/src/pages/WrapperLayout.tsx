import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export default function WrapperLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const roomCode = localStorage.getItem('roomCode');
    
    const isCreatingOrJoiningRoom = 
      window.location.pathname === '/select' || 
      window.location.pathname === '/lobby' ||
      window.location.pathname === '/roomSettings';

    if (!isCreatingOrJoiningRoom && roomCode == null) {
      navigate('/select', { replace: true });
    }
    else if (isCreatingOrJoiningRoom && roomCode != null){
      navigate(`/${roomCode}`, { replace: true });
    }
  }, [navigate]);


  return (
    <div className="p-8 w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center">
      <Outlet />
    </div>
  );
}
