import { useEffect, useRef } from 'react';

interface SparkOptions {
  selector: string;
  amount: number;
  speed: number;
  lifetime: number;
  direction: { x: number; y: number };
  size: number[];
  maxopacity: number;
  color: string;
  randColor: boolean;
  acceleration: number[];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Spark {
  x: number;
  y: number;
  age: number;
  acceleration: number;
  color: string;
  opacity: number;
  directionX: number;
  directionY: number;
  options: SparkOptions;

  constructor(x: number, y: number, options: SparkOptions) {
    this.x = x;
    this.y = y;
    this.options = options;
    this.age = 0;
    this.acceleration = rand(options.acceleration[0], options.acceleration[1]);
    this.color = options.randColor
      ? `${rand(0, 255)},${rand(0, 255)},${rand(0, 255)}`
      : options.color;
    this.opacity = options.maxopacity - this.age / (options.lifetime * rand(1, 10));

    this.directionX = Math.random() < 0.5 ? -Math.random() : Math.random();
    this.directionY = Math.random() < 0.5 ? -Math.random() : Math.random();
  }

  go() {
    this.x += this.options.speed * this.directionX * this.acceleration / 2;
    this.y += this.options.speed * this.directionY * this.acceleration / 2;
    this.opacity = this.options.maxopacity - ++this.age / this.options.lifetime;
  }
}

export function SparkEffect({
  selector = '#sparks',
  amount = 5000,
  speed = 0.05,
  lifetime = 200,
  direction = { x: -0.5, y: 1 },
  size = [2, 2],
  maxopacity = 1,
  color = '150, 150, 150',
  randColor = true,
  acceleration = [5, 40],
  className = ''
}: {
  selector?: string;
  amount?: number;
  speed?: number;
  lifetime?: number;
  direction?: { x: number; y: number };
  size?: number[];
  maxopacity?: number;
  color?: string;
  randColor?: boolean;
  acceleration?: number[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const OPT: SparkOptions = {
      selector,
      amount,
      speed: window.innerWidth < 520 ? 0.05 : speed,
      lifetime,
      direction,
      size,
      maxopacity,
      color: window.innerWidth < 520 ? '150, 150, 150' : color,
      randColor,
      acceleration
    };

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let sparks: Spark[] = [];

    function setCanvasWidth() {
      if (!ctx || !canvas) return;
      ctx.canvas.width = window.innerWidth;
      ctx.canvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight);
    }

    function addSpark() {
      let x = rand(-200, window.innerWidth + 200);
      let y = rand(-200, Math.max(window.innerHeight, document.documentElement.scrollHeight) + 200);
      sparks.push(new Spark(x, y, OPT));
    }

    function drawSpark(spark: Spark) {
      let x = spark.x,
        y = spark.y;
      spark.go();
      ctx!.beginPath();
      ctx!.fillStyle = `rgba(${spark.color}, ${spark.opacity})`;
      ctx!.rect(x, y, OPT.size[0], OPT.size[1]);
      ctx!.fill();
    }

    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    function init() {
      setCanvasWidth();
      intervalId = setInterval(() => {
        if (sparks.length < OPT.amount) {
          addSpark();
        }
      }, 1000 / OPT.amount);
      animationFrameId = window.requestAnimationFrame(draw);
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = 'rgba(255,255,255,0)'; // fully transparent "wipe"
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      sparks.forEach((spark, i, array) => {
        if (spark.opacity <= 0) {
          array.splice(i, 1);
        } else {
          drawSpark(spark);
        }
      });
      animationFrameId = window.requestAnimationFrame(draw);
    }

    window.addEventListener('resize', setCanvasWidth);
    init();

    return () => {
      window.removeEventListener('resize', setCanvasWidth);
      window.cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
    };
  }, [selector, amount, speed, lifetime, direction, size, maxopacity, color, randColor, acceleration]);

  return (
    <>
      <canvas
        ref={canvasRef}
        id="sparks"
        className={className}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

    </>
  );
}