// src/pages/Home.tsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-container">
      <div className="content">
        <h1>D-Ice Game</h1>
        <p>Welcome to our awesome D-Ice game!</p>
        <Link to="/game" className="play-button">Play Now</Link>
      </div>
    </div>
  );
}