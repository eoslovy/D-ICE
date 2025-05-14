import { createBrowserRouter } from "react-router-dom";
import WrapperLayout from "./pages/WrapperLayout";
import App from "./game/App";
import Select from "./pages/select";
import AdminRoom from "./pages/room/AdminRoom";
import UserRoom from "./pages/room/UserRoom";
import BroadcastRoom from "./pages/room/BroadcastRoom";
import Set from "./pages/set";
import Lobby from "./pages/lobby";
import Join from "./pages/join/Join";
import NotFound from "./pages/error/NotFound";

export const router = createBrowserRouter([
    {
        path: "/test",
        element: <App />,
    },
    {
        path: "/",
        element: <WrapperLayout />,
        children: [
            {
                index: true, // 기본 경로로 설정
                element: <Select />, // 기본 컴포넌트로 Select 렌더링
            },
            {
                path: "/game",
                element: <App />,
            },
            {
                path: "/join",
                element: <Join />,
            },
            {
                path: "/select",
                element: <Select />,
            },
            {
                path: "/adminroom/:roomCode",
                element: <AdminRoom />,
            },
            {
                path: "/userroom/:roomCode",
                element: <UserRoom />,
            },
            {
                path: "/broadcast/:roomCode",
                element: <BroadcastRoom />,
            },
            {
                path: "/roomSettings",
                element: <Set />,
            },
            {
                path: "/lobby",
                element: <Lobby />,
            },
            {
                path: "*", // 선언되지 않은 모든 경로 처리
                element: <NotFound />, // 404 페이지 렌더링
            },
        ],
    },
]);
