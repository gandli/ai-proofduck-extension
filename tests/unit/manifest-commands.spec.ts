/**
 * v0.5.2 快捷键：Alt+Shift+P 打开侧边栏
 *
 * TDD 里我们不能 spawn 真 chrome extension；只能验证 manifest 上有正确声明。
 * 快捷键实际行为由 background 里 chrome.commands.onCommand 桥接到 sidePanel.open。
 */
import { describe, it, expect } from 'vitest';
import { defineConfig } from 'wxt';
import config from '../../wxt.config';

// wxt.config default export 是 defineConfig() 结果；直接读它的 manifest 段
type WxtManifest = {
  commands?: Record<
    string,
    {
      suggested_key?: { default?: string; mac?: string };
      description?: string;
    }
  >;
};

describe('v0.5.2 · manifest.commands 快捷键声明', () => {
  it('声明了 _execute_action / open-side-panel 快捷键', () => {
    // wxt.config export 是 UserConfig，manifest 可能是对象或函数
    const cfg = config as unknown as { manifest: WxtManifest };
    const manifest = cfg.manifest;
    expect(manifest.commands).toBeDefined();
    expect(manifest.commands?.['open-side-panel']).toBeDefined();
  });

  it('open-side-panel 快捷键默认 Alt+Shift+P（跨平台），mac 明确一致', () => {
    const cfg = config as unknown as { manifest: WxtManifest };
    const cmd = cfg.manifest.commands?.['open-side-panel'];
    expect(cmd?.suggested_key?.default).toBe('Alt+Shift+P');
    // Chrome 允许 mac 单独覆盖；我们保持一致避免用户混淆
    expect(cmd?.suggested_key?.mac).toBe('Alt+Shift+P');
    expect(cmd?.description).toBeTruthy();
  });

  // 兜底：defineConfig 类型检查
  it('wxt config 本身正常 export', () => {
    expect(defineConfig).toBeDefined();
    expect(config).toBeDefined();
  });
});
