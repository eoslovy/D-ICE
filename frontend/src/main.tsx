import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { WebSocketProvider } from './modules/WebSocketContext.tsx';
import './vite-env.d.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  // </React.StrictMode>
);
