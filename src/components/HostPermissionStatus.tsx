/** HostPermissionStatus: baseUrl 对应的域名授权状态 */
import { useMemo } from 'react';
import { extractOriginPattern } from '@core/origin-pattern';
import type { PermState } from './types';

interface Props {
  baseUrl: string;
  permState: PermState;
  onAuthorize: () => void;
}

function useHostOrigin(baseUrl: string) {
  return useMemo(() => {
    if (!baseUrl) return '';
    try { return new URL(baseUrl).host; } catch { return ''; }
  }, [baseUrl]);
}

function useHostPattern(baseUrl: string) {
  return useMemo(() => {
    if (!baseUrl) return null;
    try { return extractOriginPattern(baseUrl); } catch { return null; }
  }, [baseUrl]);
}

export function HostPermissionStatus({ baseUrl, permState, onAuthorize }: Props) {
  const hostPattern = useHostPattern(baseUrl);
  const hostOrigin = useHostOrigin(baseUrl);
  if (!hostPattern || !hostOrigin) return null;

  if (permState.status === 'missing') {
    return (
      <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-300 text-xs">
        <p className="text-amber-800 mb-2">
          ⚠️ 还未获得访问 <code className="font-mono">{hostOrigin}</code> 权限，翻译请求会被浏览器拦截。
        </p>
        <button
          type="button"
          onClick={onAuthorize}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
        >
          授权访问 {hostOrigin}
        </button>
      </div>
    );
  }
  if (permState.status === 'requesting') {
    return (
      <div className="mt-2 p-2 rounded-md bg-slate-50 border border-slate-300 text-xs text-slate-600">
        正在请求授权...
      </div>
    );
  }
  if (permState.status === 'granted') {
    return <p className="mt-2 text-xs text-emerald-600">✅ 已授权访问 <code className="font-mono">{hostOrigin}</code></p>;
  }
  if (permState.status === 'denied') {
    return (
      <div className="mt-2 p-2 rounded-md bg-rose-50 border border-rose-300 text-xs">
        <p className="text-rose-800 mb-2">❌ 授权被拒绝，翻译无法访问 <code className="font-mono">{hostOrigin}</code>。</p>
        <button
          type="button"
          onClick={onAuthorize}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
        >
          授权访问 {hostOrigin}
        </button>
      </div>
    );
  }
  return null;
}
