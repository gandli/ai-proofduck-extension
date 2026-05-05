/**
 * ResultPopup - 翻译/校对结果浮层
 * 内容脚本使用的轻量级结果展示组件
 */

import { TranslationResultLayer } from './TranslationResultLayer';
import type { Correction } from '../types';

interface Props {
  /** 原始文本 */
  originalText: string;
  /** 结果文本 */
  resultText: string;
  /** 修正列表（校对模式） */
  corrections?: Correction[];
  /** 浮层位置 */
  position: { x: number; y: number };
  /** 关闭回调 */
  onClose: () => void;
  /** 复制回调 */
  onCopy?: (text: string) => void;
}

/**
 * 结果浮层组件
 * 用于内容脚本中展示翻译/校对结果
 */
export function ResultPopup({
  originalText,
  resultText,
  corrections: _corrections,
  position,
  onClose,
  onCopy,
}: Props) {
  return (
    <TranslationResultLayer
      originalText={originalText}
      resultText={resultText}
      position={position}
      onClose={onClose}
      {...(onCopy && { onCopy })}
      isStreaming={false}
    />
  );
}

export default ResultPopup;
