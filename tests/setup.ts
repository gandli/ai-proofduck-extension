/**
 * Vitest 全局 setup：注入 chrome API mock、happy-dom 补丁、testing-library 清理
 *
 * WxtVitest() 已经提供了 fakeBrowser（chrome.storage/runtime 等），
 * 这里只补齐它未覆盖的 API，并统一测试收尾。
 */
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { fakeBrowser } from 'wxt/testing';
// 让 toHaveValue / toBeInTheDocument / toBeDisabled 等 DOM matcher 全局可用
import '@testing-library/jest-dom/vitest';

beforeEach(() => {
  fakeBrowser.reset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
