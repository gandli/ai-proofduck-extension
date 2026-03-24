export function toEngineBadge(notice?: string) {
  if (!notice) return '';
  if (notice.includes('浏览器内置 AI')) return '浏览器 AI';
  if (notice.includes('WebGPU')) return '本地 AI（GPU）';
  if (notice.includes('WASM')) return '本地 AI（兼容）';
  if (notice.includes('在线 API')) return '在线 AI';
  if (
    notice.includes('第三方免费翻译兜底') ||
    notice.includes('内置翻译兜底') ||
    notice.includes('Google 翻译') ||
    notice.includes('百度翻译') ||
    notice.includes('翻译服务暂时不可用')
  ) {
    return '翻译服务';
  }

  if (
    notice.includes('页内翻译兜底') ||
    notice.includes('兼容兜底模式') ||
    notice.includes('快速翻译')
  ) {
    return '快速翻译';
  }

  if (notice.includes('复用')) return '最近结果';
  return notice;
}
