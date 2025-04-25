// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import App from './game/App';
import Home from './pages/Home';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/game',
    element: <App />
  }
]);