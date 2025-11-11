
import React, { useState, useCallback } from 'react';
import Game from './components/Game';
import { GameStatus } from './types';
import { Bone, Cat, Dog, Skull } from './components/Icons';

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center text-center p-4">
    <h1 className="text-6xl md:text-8xl font-black uppercase text-yellow-400 drop-shadow-lg" style={{ fontFamily: 'Impact, sans-serif' }}>
      Dogman
    </h1>
    <h2 className="text-3xl md:text-5xl font-bold uppercase text-white mb-8 drop-shadow-md" style={{ fontFamily: 'Impact, sans-serif' }}>
      The Bark Knight
    </h2>
    <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md">
      <h3 className="text-2xl font-bold text-yellow-400 mb-4">How to Play</h3>
      <ul className="text-left space-y-2 text-gray-200">
        <li><span className="font-bold text-white">Arrow Keys:</span> Move Left & Right</li>
        <li><span className="font-bold text-white">Up Arrow:</span> Jump</li>
        <li><span className="font-bold text-white">Spacebar:</span> Throw Bone</li>
      </ul>
      <p className="mt-4">Collect bones <Bone className="inline-block h-6 w-6 align-text-bottom" /> to score. Defeat evil cats <Cat className="inline-block h-6 w-6 align-text-bottom" />. Don't let them touch you!</p>
    </div>
    <button
      onClick={onStart}
      className="mt-8 bg-yellow-400 text-gray-900 font-bold py-4 px-10 text-2xl rounded-lg shadow-lg hover:bg-yellow-300 transform hover:scale-105 transition-transform duration-200"
    >
      Start Game
    </button>
  </div>
);

const GameOverScreen: React.FC<{ score: number; highScore: number; onRestart: () => void }> = ({ score, highScore, onRestart }) => (
  <div className="absolute inset-0 bg-red-900 bg-opacity-80 flex flex-col items-center justify-center text-center p-4">
    <Skull className="w-24 h-24 text-gray-200 mb-4" />
    <h1 className="text-6xl md:text-8xl font-black uppercase text-gray-200 drop-shadow-lg" style={{ fontFamily: 'Impact, sans-serif' }}>
      Death of Shame!
    </h1>
    <div className="text-2xl md:text-4xl text-white mt-4">
      <p>Final Score: <span className="font-bold text-yellow-300">{score}</span></p>
      <p>High Score: <span className="font-bold text-yellow-300">{highScore}</span></p>
    </div>
    <button
      onClick={onRestart}
      className="mt-8 bg-gray-200 text-gray-900 font-bold py-4 px-10 text-2xl rounded-lg shadow-lg hover:bg-white transform hover:scale-105 transition-transform duration-200"
    >
      Play Again
    </button>
  </div>
);


const HUD: React.FC<{ score: number; highScore: number }> = ({ score, highScore }) => (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between text-2xl font-bold text-white drop-shadow-md">
        <div>Score: <span className="text-yellow-400">{score}</span></div>
        <div>High Score: <span className="text-yellow-400">{highScore}</span></div>
    </div>
);


export default function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.Start);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('dogmanHighScore') || 0));

  const startGame = useCallback(() => {
    setScore(0);
    setGameStatus(GameStatus.Playing);
  }, []);

  const gameOver = useCallback((finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('dogmanHighScore', String(finalScore));
    }
    setGameStatus(GameStatus.GameOver);
  }, [highScore]);
  
  return (
    <main className="w-screen h-screen bg-gray-900 flex items-center justify-center overflow-hidden">
      <div className="relative shadow-2xl" style={{aspectRatio: '16/9', width: '100%', maxWidth: '1280px'}}>
        {gameStatus === GameStatus.Playing && <HUD score={score} highScore={highScore} />}
        {gameStatus !== GameStatus.Start && <Game gameStatus={gameStatus} setScore={setScore} onGameOver={gameOver} />}
        {gameStatus === GameStatus.Start && <StartScreen onStart={startGame} />}
        {gameStatus === GameStatus.GameOver && <GameOverScreen score={score} highScore={highScore} onRestart={startGame} />}
      </div>
    </main>
  );
}
