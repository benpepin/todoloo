import { motion } from 'motion/react';

export function AnimatedBars() {
  // Colorful candy-like balls with varied sizes and heights
  const balls = [
    { delay: 0, x: -14, height: 28, size: 9, color: '#FF6B9D' },      // Pink
    { delay: 0.12, x: -7, height: 18, size: 8, color: '#FFA36C' },    // Orange
    { delay: 0.24, x: 0, height: 35, size: 10, color: '#FFE66D' },    // Yellow
    { delay: 0.36, x: 7, height: 22, size: 9, color: '#A8E6CF' },     // Mint green
    { delay: 0.48, x: 14, height: 30, size: 8, color: '#4ECDC4' },    // Turquoise
  ];

  return (
    <div className="relative w-16 h-12 flex items-end justify-center pb-1">
      {/* Bouncing balls */}
      {balls.map((ball, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{
            backgroundColor: ball.color,
            width: ball.size,
            height: ball.size,
            bottom: 4,
            left: '50%',
            marginLeft: ball.x - ball.size / 2,
          }}
          animate={{
            y: [0, -ball.height, 0],
            scaleY: [1, 1.1, 0.9, 1],
            scaleX: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 0.65,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: ball.delay,
            times: [0, 0.5, 1],
          }}
        />
      ))}

      {/* Shadow effects for each ball */}
      {balls.map((ball, index) => (
        <motion.div
          key={`shadow-${index}`}
          className="absolute rounded-full"
          style={{
            backgroundColor: ball.color,
            opacity: 0.2,
            width: ball.size,
            height: 3,
            bottom: 2,
            left: '50%',
            marginLeft: ball.x - ball.size / 2,
          }}
          animate={{
            scaleX: [1, 0.7, 1],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{
            duration: 0.65,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: ball.delay,
          }}
        />
      ))}
    </div>
  );
}
