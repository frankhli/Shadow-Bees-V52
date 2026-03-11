/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./admin.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 背景层级 - 使用 CSS 变量
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        // surface 别名（用于 Group End）
        'surface': 'var(--bg-secondary)',
        'surface-hover': 'var(--bg-tertiary)',
        // 霓虹色 - 使用 CSS 变量支持主题切换
        'neon-cyan': 'var(--neon-cyan, #00F0FF)',
        'neon-amber': 'var(--neon-amber, #FFB800)',
        'neon-red': 'var(--neon-red, #FF4757)',
        'neon-purple': 'var(--neon-purple, #A855F7)',
        'neon-green': 'var(--neon-green, #00E396)',
        // 文字层级 - 使用 CSS 变量
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // 边框 - 使用 CSS 变量
        'border-color': 'var(--border-color)',
      },
      fontFamily: {
        'din': ['DIN Pro', 'sans-serif'],
        'mono': ['Roboto Mono', 'monospace'],
        'pingfang': ['PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'number-roll': 'number-roll 1s ease-out',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'radar-sweep': 'radar-sweep 2s linear infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 0.5s ease-out',
      },
      keyframes: {
        'number-roll': {
          'from': { transform: 'translateY(-100%)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'neon-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        },
        'radar-sweep': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.5)',
        'neon-amber': '0 0 10px rgba(255, 184, 0, 0.5)',
        'neon-red': '0 0 10px rgba(255, 71, 87, 0.5)',
        'neon-purple': '0 0 8px rgba(168, 85, 247, 0.5)',
      },
      gridTemplateColumns: {
        '24': 'repeat(24, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
