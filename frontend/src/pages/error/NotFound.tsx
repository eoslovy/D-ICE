import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-6xl font-bold mb-4">404 Not Found</h1>
      <p className="text-xl mb-6">페이지를 찾을 수 없습니다.</p>
      <p className="text-md mb-8 text-gray-400">
        요청하신 페이지가 존재하지 않거나, 잘못된 경로로 접근하셨습니다.
      </p>
      <Link
        to="/select"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
      >
        메인페이지로 가기
      </Link>
    </div>
  );
}