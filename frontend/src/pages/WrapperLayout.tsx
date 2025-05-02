import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

export default function WrapperLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const roomcode = sessionStorage.getItem('roomcode');
    
    const isCreatingOrJoiningRoom = 
      window.location.pathname === '/select' || 
      window.location.pathname === '/lobby' ||
      window.location.pathname === '/roomSettings';

    if (!isCreatingOrJoiningRoom && roomcode == null) {
      navigate('/select', { replace: true });
    }
    else if (isCreatingOrJoiningRoom && roomcode != null){
      navigate(`/${roomcode}`, { replace: true });
    }
  }, [navigate]);


  return (
    <div className="p-8 w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center">
      <Outlet />
    </div>
  );
}
