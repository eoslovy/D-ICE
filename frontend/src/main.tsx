import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './vite-env.d.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Strict mode 는 개발 중 비활성화 (싱글톤 문제)
  // <React.StrictMode>
    <RouterProvider router={router} />
  // </React.StrictMode>
);
