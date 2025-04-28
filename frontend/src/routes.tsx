import { createBrowserRouter } from 'react-router-dom';
import App from './game/App';
import Home from './pages/Home';
import Select from './pages/select';

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
    path: '/select',
    element: <Select />
  },
]);