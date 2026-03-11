/**
 * 懒加载图片组件
 * 优化首屏加载性能
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* 占位符 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary">
          {placeholder || (
            <div className="flex flex-col items-center gap-2 text-text-secondary">
              <ImageIcon size={24} opacity={0.5} />
            </div>
          )}
        </div>
      )}

      {/* 实际图片 */}
      {isInView && !hasError && (
        <motion.img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary text-text-secondary">
          <span className="text-xs">加载失败</span>
        </div>
      )}
    </div>
  );
}

export default LazyImage;
