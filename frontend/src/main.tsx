import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './vite-env.d.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
);
