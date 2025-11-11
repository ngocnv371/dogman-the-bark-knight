import React, { useRef, useEffect, useCallback } from 'react';
import { GameStatus, Player, Platform, Cat, Bone, ThrownBone, GameObject } from '../types';
import * as C from '../constants';

interface GameProps {
  gameStatus: GameStatus;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  onGameOver: (finalScore: number) => void;
}

const Game: React.FC<GameProps> = ({ gameStatus, setScore, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameFrame = useRef<number>(0);
  const scoreRef = useRef(0);

  // Game state refs
  const playerRef = useRef<Player>({ x: 150, y: 100, width: C.PLAYER_WIDTH, height: C.PLAYER_HEIGHT, vy: 0, isGrounded: false });
  const platformsRef = useRef<Platform[]>([]);
  const catsRef = useRef<Cat[]>([]);
  const collectibleBonesRef = useRef<Bone[]>([]);
  const thrownBonesRef = useRef<(ThrownBone | null)[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const cameraXRef = useRef(0);
  const lastBoneThrowTimeRef = useRef(0);

  // Parallax background refs
  const distantBuildingsRef = useRef<GameObject[]>([]);
  const midgroundBuildingsRef = useRef<GameObject[]>([]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    // Cape
    ctx.fillStyle = '#dc2626'; // red-600
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + 10);
    ctx.lineTo(player.x - 20, player.y + player.height / 2);
    ctx.lineTo(player.x, player.y + player.height - 10);
    ctx.fill();
    
    // Body
    ctx.fillStyle = '#4b5563'; // gray-600
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Head
    ctx.fillStyle = '#6b7280'; // gray-500
    ctx.fillRect(player.x, player.y, player.width, player.height/3);
    // Ears
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + 10, player.y - 10);
    ctx.lineTo(player.x + 20, player.y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(player.x + player.width - 20, player.y);
    ctx.lineTo(player.x + player.width - 10, player.y - 10);
    ctx.lineTo(player.x + player.width, player.y);
    ctx.fill();
  };
  
  const drawPlatform = (ctx: CanvasRenderingContext2D, platform: Platform) => {
    ctx.fillStyle = '#374151'; // gray-700
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#4b5563'; // gray-600
    ctx.fillRect(platform.x, platform.y, platform.width, 10);
  };
  
  const drawCat = (ctx: CanvasRenderingContext2D, cat: Cat) => {
    ctx.fillStyle = '#111827'; // A very dark gray, looks better than pure black
    const { x, y, width, height } = cat;

    // Tail
    ctx.beginPath();
    ctx.moveTo(x + width * 0.9, y + height * 0.9);
    ctx.bezierCurveTo(
      x + width * 1.3, y + height * 0.7, // Control point 1
      x + width * 1.3, y + height * 0.2, // Control point 2
      x + width * 0.9, y + height * 0.2  // End point
    );
    // Add thickness to the tail
     ctx.bezierCurveTo(
      x + width * 1.2, y + height * 0.3, // Inner curve cp 1
      x + width * 1.2, y + height * 0.6, // Inner curve cp 2
      x + width * 0.8, y + height * 0.9  // Back to body
    );
    ctx.closePath();
    ctx.fill();

    // Body and Head as one silhouette
    ctx.beginPath();
    ctx.moveTo(x + width, y + height); // Start at bottom right
    // Right side of body/back
    ctx.quadraticCurveTo(x + width, y + height * 0.4, x + width * 0.7, y + height * 0.2);
    // Top of head
    ctx.lineTo(x + width * 0.5, y + height * 0.15); // Ear base right
    ctx.lineTo(x + width * 0.6, y); // Right ear tip
    ctx.lineTo(x + width * 0.4, y + height * 0.1); // Between ears
    ctx.lineTo(x + width * 0.3, y); // Left ear tip
    ctx.lineTo(x + width * 0.2, y + height * 0.15); // Ear base left
    // Face and front of body
    ctx.quadraticCurveTo(x - width * 0.05, y + height * 0.5, x, y + height);
    // Bottom
    ctx.closePath();
    ctx.fill();

    // Evil Eyes
    ctx.fillStyle = '#ef4444'; // red-500
    const eyeYPos = y + height * 0.3;
    const eyeRadius = 3;
    
    ctx.beginPath();
    ctx.arc(x + width * 0.35, eyeYPos, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + width * 0.55, eyeYPos, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBone = (ctx: CanvasRenderingContext2D, bone: Bone | ThrownBone) => {
    ctx.save();
    
    const { x, y, width, height } = bone;

    // If it's a thrown bone, apply rotation
    if ('rotation' in bone && typeof bone.rotation === 'number') {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(bone.rotation);
      ctx.translate(-(x + width / 2), -(y + height / 2));
    }

    ctx.fillStyle = '#f8fafc'; // slate-50 for a nice off-white

    const h = height;
    const w = width;

    // Proportions
    const endRadius = h / 2;
    const shaftInset = h * 0.25; // How much the shaft is thinner on each side

    ctx.beginPath();

    // Start at top-left of the left "knob"
    ctx.moveTo(x + endRadius, y);
    
    // Top edge
    // Curve from left knob to shaft
    ctx.quadraticCurveTo(x + endRadius, y + shaftInset, x + w / 2, y + shaftInset);
    // Curve from shaft to right knob
    ctx.quadraticCurveTo(x + w - endRadius, y + shaftInset, x + w - endRadius, y);
    
    // Right knob (a semicircle)
    ctx.arc(x + w - endRadius, y + endRadius, endRadius, -Math.PI / 2, Math.PI / 2, false);

    // Bottom edge
    // Curve from right knob to shaft
    ctx.quadraticCurveTo(x + w - endRadius, y + h - shaftInset, x + w / 2, y + h - shaftInset);
    // Curve from shaft to left knob
    ctx.quadraticCurveTo(x + endRadius, y + h - shaftInset, x + endRadius, y + h);

    // Left knob (a semicircle)
    ctx.arc(x + endRadius, y + endRadius, endRadius, Math.PI / 2, -Math.PI / 2, false);
    
    ctx.closePath();
    ctx.fill();

    // Add a subtle outline/shadow for depth, makes it pop from the background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  };

  const drawMoon = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#f0f9ff'; // slate-50
    ctx.beginPath();
    // Main circle
    ctx.arc(C.CANVAS_WIDTH - 120, 100, 50, 0, 2 * Math.PI);
    ctx.fill();
    // Shadow circle to make a crescent
    ctx.fillStyle = '#0f172a'; // Same as sky color
    ctx.beginPath();
    ctx.arc(C.CANVAS_WIDTH - 135, 90, 45, 0, 2 * Math.PI);
    ctx.fill();
};

  const generateBuildings = useCallback((
      buildingsRef: React.MutableRefObject<GameObject[]>,
      config: {
          cameraX: number,
          horizonY: number,
          minWidth: number, maxWidth: number,
          minHeight: number, maxHeight: number,
          minGap: number, maxGap: number,
      }
  ) => {
      let lastBuildingX = 0;
      if (buildingsRef.current.length > 0) {
          const lastBuilding = buildingsRef.current[buildingsRef.current.length - 1];
          lastBuildingX = lastBuilding.x + lastBuilding.width;
      } else {
          lastBuildingX = -50; // Start slightly off-screen
      }

      while (lastBuildingX < config.cameraX + C.CANVAS_WIDTH * 2) {
          const gap = config.minGap + Math.random() * (config.maxGap - config.minGap);
          const newBuildingX = lastBuildingX + gap;

          const width = config.minWidth + Math.random() * (config.maxWidth - config.minWidth);
          const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
          
          buildingsRef.current.push({
              x: newBuildingX,
              y: config.horizonY - height,
              width,
              height,
          });
          lastBuildingX = newBuildingX + width;
      }
  }, []);

  const generatePlatforms = useCallback(() => {
    let lastPlatformX = 0;
    let lastPlatformY = C.CANVAS_HEIGHT - 50;

    if (platformsRef.current.length > 0) {
      const lastPlatform = platformsRef.current[platformsRef.current.length - 1];
      lastPlatformX = lastPlatform.x + lastPlatform.width;
      lastPlatformY = lastPlatform.y;
    }

    while (lastPlatformX < C.CANVAS_WIDTH + cameraXRef.current + 200) {
      const newPlatformX = lastPlatformX + C.MIN_PLATFORM_GAP + Math.random() * (C.MAX_PLATFORM_GAP - C.MIN_PLATFORM_GAP);
      const width = C.MIN_PLATFORM_WIDTH + Math.random() * (C.MAX_PLATFORM_WIDTH - C.MIN_PLATFORM_WIDTH);
      
      const yOffset = C.MIN_PLATFORM_HEIGHT_OFFSET + Math.random() * (C.MAX_PLATFORM_HEIGHT_OFFSET - C.MIN_PLATFORM_HEIGHT_OFFSET);
      let y = lastPlatformY + yOffset;
      y = Math.max(200, Math.min(C.CANVAS_HEIGHT - 50, y));

      const newPlatform = { x: newPlatformX, y, width, height: C.CANVAS_HEIGHT - y };
      platformsRef.current.push(newPlatform);
      
      // Spawn items on platform
      if (Math.random() < 0.3) { // 30% chance to spawn a cat
        catsRef.current.push({
          x: newPlatform.x + Math.random() * (newPlatform.width - C.CAT_WIDTH),
          y: newPlatform.y - C.CAT_HEIGHT,
          width: C.CAT_WIDTH,
          height: C.CAT_HEIGHT
        });
      }
       if (Math.random() < 0.5) { // 50% chance to spawn a bone
         collectibleBonesRef.current.push({
          x: newPlatform.x + Math.random() * (newPlatform.width - C.COLLECTIBLE_BONE_WIDTH),
          y: newPlatform.y - C.COLLECTIBLE_BONE_HEIGHT - 10,
          width: C.COLLECTIBLE_BONE_WIDTH,
          height: C.COLLECTIBLE_BONE_HEIGHT
        });
      }
      lastPlatformX = newPlatformX;
      lastPlatformY = y;
    }
  }, []);

  const resetGame = useCallback(() => {
    playerRef.current = { x: 150, y: 100, width: C.PLAYER_WIDTH, height: C.PLAYER_HEIGHT, vy: 0, isGrounded: false };
    platformsRef.current = [{ x: -50, y: C.CANVAS_HEIGHT - 100, width: 600, height: 150 }];
    catsRef.current = [];
    collectibleBonesRef.current = [];
    thrownBonesRef.current = [];
    keysRef.current = {};
    cameraXRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    generatePlatforms();

    // Reset and generate initial background
    distantBuildingsRef.current = [];
    midgroundBuildingsRef.current = [];
    generateBuildings(distantBuildingsRef, {
        cameraX: 0, horizonY: C.CANVAS_HEIGHT,
        minWidth: 80, maxWidth: 200, minHeight: 100, maxHeight: 350,
        minGap: 0, maxGap: 10,
    });
    generateBuildings(midgroundBuildingsRef, {
        cameraX: 0, horizonY: C.CANVAS_HEIGHT,
        minWidth: 60, maxWidth: 150, minHeight: 80, maxHeight: 250,
        minGap: 5, maxGap: 20,
    });

  }, [setScore, generatePlatforms, generateBuildings]);

  const gameLoop = useCallback(() => {
    if (gameStatus !== GameStatus.Playing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // --- UPDATE LOGIC ---
    const player = playerRef.current;

    // Handle input
    if (keysRef.current['ArrowLeft']) player.x -= C.PLAYER_MOVE_SPEED;
    if (keysRef.current['ArrowRight']) player.x += C.PLAYER_MOVE_SPEED;
    if (keysRef.current['ArrowUp'] && player.isGrounded) {
      player.vy = C.PLAYER_JUMP_FORCE;
      player.isGrounded = false;
    }
    if(keysRef.current[' '] && Date.now() - lastBoneThrowTimeRef.current > C.BONE_THROW_COOLDOWN) {
        thrownBonesRef.current.push({
            x: player.x + player.width,
            y: player.y + player.height / 3,
            width: C.THROWN_BONE_WIDTH,
            height: C.THROWN_BONE_HEIGHT,
            vx: C.THROWN_BONE_SPEED,
            rotation: 0,
        });
        lastBoneThrowTimeRef.current = Date.now();
    }


    // Apply gravity
    player.vy += C.GRAVITY;
    player.y += player.vy;
    player.isGrounded = false;
    
    // Platform collision
    platformsRef.current.forEach(platform => {
      if (player.x < platform.x + platform.width &&
          player.x + player.width > platform.x &&
          player.y + player.height > platform.y &&
          player.y + player.height < platform.y + 20 &&
          player.vy >= 0) {
        player.vy = 0;
        player.y = platform.y - player.height;
        player.isGrounded = true;
      }
    });

    // Update camera
    const cameraDeadzone = C.CANVAS_WIDTH / 3;
    if (player.x > cameraXRef.current + cameraDeadzone) {
      cameraXRef.current = player.x - cameraDeadzone;
    }

    // Update thrown bones
    thrownBonesRef.current = thrownBonesRef.current.filter(b => b && b.x < cameraXRef.current + C.CANVAS_WIDTH) as ThrownBone[];
    thrownBonesRef.current.forEach(bone => {
      if (!bone) return;
      bone.x += bone.vx;
      bone.rotation += 0.2;
    });

    // Collision detection: thrown bones vs cats
    thrownBonesRef.current.forEach((bone, boneIndex) => {
        if (!bone) return;
        catsRef.current.forEach((cat, catIndex) => {
            if (!cat) return;
            if (bone.x < cat.x + cat.width && bone.x + bone.width > cat.x &&
                bone.y < cat.y + cat.height && bone.y + bone.height > cat.y) {
                // A bit of a hack to prevent removing from array while iterating
                thrownBonesRef.current[boneIndex] = null;
                catsRef.current[catIndex] = null;
                scoreRef.current += 50;
                setScore(s => s + 50);
            }
        });
    });

    thrownBonesRef.current = thrownBonesRef.current.filter(Boolean);
    catsRef.current = catsRef.current.filter(Boolean) as Cat[];

    // Collision detection: player vs collectible bones
    collectibleBonesRef.current.forEach((bone, index) => {
        if (player.x < bone.x + bone.width && player.x + player.width > bone.x &&
            player.y < bone.y + bone.height && player.y + player.height > bone.y) {
            collectibleBonesRef.current.splice(index, 1);
            scoreRef.current += 10;
            setScore(s => s + 10);
        }
    });

    // Collision detection: player vs cats
    catsRef.current.forEach(cat => {
        if (player.x < cat.x + cat.width && player.x + player.width > cat.x &&
            player.y < cat.y + cat.height && player.y + player.height > cat.y) {
            onGameOver(scoreRef.current);
        }
    });

    // Game over if fallen
    if (player.y > C.CANVAS_HEIGHT) {
      onGameOver(scoreRef.current);
    }

    // --- PROCEDURAL GENERATION ---
    // Platforms
    platformsRef.current = platformsRef.current.filter(p => p.x + p.width > cameraXRef.current);
    generatePlatforms();
    // Background buildings
    distantBuildingsRef.current = distantBuildingsRef.current.filter(b => b.x + b.width > cameraXRef.current * 0.2);
    generateBuildings(distantBuildingsRef, {
        cameraX: cameraXRef.current * 0.2, horizonY: C.CANVAS_HEIGHT,
        minWidth: 80, maxWidth: 200, minHeight: 100, maxHeight: 350,
        minGap: 0, maxGap: 10,
    });
    midgroundBuildingsRef.current = midgroundBuildingsRef.current.filter(b => b.x + b.width > cameraXRef.current * 0.5);
    generateBuildings(midgroundBuildingsRef, {
        cameraX: cameraXRef.current * 0.5, horizonY: C.CANVAS_HEIGHT,
        minWidth: 60, maxWidth: 150, minHeight: 80, maxHeight: 250,
        minGap: 5, maxGap: 20,
    });


    // --- DRAWING LOGIC ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f172a'); // slate-900
    gradient.addColorStop(1, '#334155'); // slate-700
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Moon (no parallax)
    drawMoon(ctx);

    // 3. Distant City (parallax = 0.2)
    ctx.save();
    ctx.translate(-cameraXRef.current * 0.2, 0);
    ctx.fillStyle = '#1e293b'; // slate-800
    distantBuildingsRef.current.forEach(building => {
        ctx.fillRect(building.x, building.y, building.width, building.height);
    });
    ctx.restore();

    // 4. Midground City (parallax = 0.5)
    ctx.save();
    ctx.translate(-cameraXRef.current * 0.5, 0);
    const midgroundBuildingColor = '#334155'; // slate-700
    ctx.fillStyle = midgroundBuildingColor;
    midgroundBuildingsRef.current.forEach(building => {
        ctx.fillRect(building.x, building.y, building.width, building.height);
        // Windows
        ctx.fillStyle = '#facc15'; // yellow-400
        for(let y = building.y + 10; y < building.y + building.height - 10; y += 20) {
            for(let x = building.x + 10; x < building.x + building.width - 10; x += 20) {
                // Deterministic "random" based on position to prevent flickering
                if (((x * 31 + y * 17) % 100) < 40) {
                    ctx.fillRect(x, y, 5, 8);
                }
            }
        }
        ctx.fillStyle = midgroundBuildingColor; // Reset color
    });
    ctx.restore();

    // 5. Main Game World (parallax = 1)
    ctx.save();
    ctx.translate(-cameraXRef.current, 0);
    platformsRef.current.forEach(p => drawPlatform(ctx, p));
    catsRef.current.forEach(c => c && drawCat(ctx, c));
    collectibleBonesRef.current.forEach(b => drawBone(ctx, b));
    thrownBonesRef.current.forEach(b => b && drawBone(ctx, b));
    drawPlayer(ctx, player);
    ctx.restore();

    gameFrame.current = requestAnimationFrame(gameLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, onGameOver, setScore, generatePlatforms, generateBuildings]);

  useEffect(() => {
    if (gameStatus === GameStatus.Playing) {
      resetGame();
      gameFrame.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      cancelAnimationFrame(gameFrame.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        width={C.CANVAS_WIDTH} 
        height={C.CANVAS_HEIGHT}
        className="w-full h-full"
    />
  );
};

export default Game;