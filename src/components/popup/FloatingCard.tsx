/**
 * FloatingCard 组件 - 浮层卡片
 * 位置自适应，最大宽高限制
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface FloatingCardProps {
  /** 触发元素位置 */
  position: { x: number; y: number };
  /** 子元素 */
  children: React.ReactNode;
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
}

export function FloatingCard({
  position,
  children,
  visible,
  onClose,
  maxWidth = 360,
  maxHeight = 400,
}: FloatingCardProps) {
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // 计算浮层位置（确保在可视区域内）
  const calculatePosition = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认浮层尺寸
    const cardWidth = Math.min(maxWidth, viewportWidth - 40);
    const cardHeight = maxHeight;

    let x = position.x;
    let y = position.y;

    // 水平方向调整
    if (x + cardWidth > viewportWidth - 20) {
      x = viewportWidth - cardWidth - 20;
    }
    if (x < 20) {
      x = 20;
    }

    // 垂直方向调整
    if (y + cardHeight > viewportHeight - 20) {
      y = position.y - cardHeight - 20; // 显示在鼠标上方
    }
    if (y < 20) {
      y = 20;
    }

    return { x, y };
  }, [position, maxWidth, maxHeight]);

  useEffect(() => {
    if (visible) {
      setCardPosition(calculatePosition());
    }
  }, [visible, calculatePosition]);

  // 监听点击外部关闭
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (cardRef.current && !cardRef.current.contains(target)) {
        // 延迟关闭，避免点击按钮时触发
        setTimeout(onClose, 100);
      }
    };

    // 监听 ESC 键关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={cardRef}
      className="proofduck-floating-card fixed bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
      style={{
        left: `${cardPosition.x}px`,
        top: `${cardPosition.y}px`,
        width: `${Math.min(maxWidth, window.innerWidth - 40)}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 2147483647,
      }}
    >
      {children}
    </div>
  );
}

export default FloatingCard;