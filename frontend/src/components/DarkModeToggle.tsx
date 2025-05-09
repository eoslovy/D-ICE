import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"

export default function DarkModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 컴포넌트가 마운트될 때 로컬스토리지에서 다크 모드 상태 확인
  useEffect(() => {
    const darkModeSetting = localStorage.getItem("isDarkMode");
    if (darkModeSetting) {
      setIsDarkMode(darkModeSetting === "true");
    } else {
      // 다크 모드 상태가 없다면 기본값에 따라 설정
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    }
  }, []);

  // 페이지 로드 후 다크 모드 상태에 맞게 클래스를 추가하거나 제거
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]); // isDarkMode가 변경될 때마다 실행

  // 다크 모드 토글 함수
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      localStorage.setItem("isDarkMode", newMode ? "true" : "false");
      return newMode;
    });
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
    </button>
  )
}