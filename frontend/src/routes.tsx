import { createBrowserRouter } from 'react-router-dom';
import WrapperLayout from './pages/WrapperLayout';
import App from './game/App';
import Select from './pages/select';
import AdminRoom from './pages/room/AdminRoom';
import UserRoom from './pages/room/UserRoom';
import BroadcastRoom from './pages/room/BroadcastRoom';
import Set from './pages/set';
import Lobby from './pages/lobby';

export const router = createBrowserRouter([
  // {
  //   path: '/',
  //   element: <Home />
  // },
  {
    path: '/game',
    element: <App />
  },
  {
    path: '/',
    element: <WrapperLayout />,
    children: [
      {
        path: '/select',
        element: <Select />,
      },
      {
        path: '/adminroom/:roomCode',
        element: <AdminRoom />,
      },
      {
        path: '/userroom/:roomCode',
        element: <UserRoom />,
      },
      {
        path: '/broadcast/:roomCode',
        element: <BroadcastRoom />,
      },
      {
        path: '/roomSettings',
        element: <Set />,
      },
      {
        path: '/lobby',
        element: <Lobby />,
      },
    ],
  },
]);