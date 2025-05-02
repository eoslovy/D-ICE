import { createBrowserRouter } from 'react-router-dom';
import WrapperLayout from './pages/WrapperLayout';
import App from './game/App';
import Home from './pages/Home';
import Select from './pages/select';
import Room from './pages/room';
import Set from './pages/set';
import Lobby from './pages/lobby';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
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
        path: '/:roomCode',
        element: <Room />,
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