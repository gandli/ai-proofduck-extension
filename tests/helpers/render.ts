/**
 * 测试 render helper · act 包装收口
 *
 * v0.5.3 P1-B（审计 v2）：直接调 render(<X />) 时，X 内部 useEffect 里 setState
 * （例如引擎 isAvailable → resolve → setState、hydrateSettings 异步）会触发
 * "not wrapped in act(...)" warning，全项目累计 30+ 条噪音。
 *
 * 收口成 renderAct 后：
 * - 所有测试都能一行调用（`await renderAct(<X />)`）
 * - 内部把 render 包在 act，flush 一次 microtask，让 effects 里的 setState 稳定
 * - 保留原始 render 的返回类型（container/rerender/unmount 都能拿到）
 */
import { render as rtlRender, act } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * 异步 render：把 render 包在 act 里，flush effects 后返回结果。
 *
 * @example
 * const { container } = await renderAct(<App />);
 */
export async function renderAct(
  ui: ReactElement,
  options?: RenderOptions
): Promise<RenderResult> {
  let result: RenderResult | undefined;
  await act(async () => {
    result = rtlRender(ui, options);
  });
  // rtlRender 是同步 API，result 一定被赋值
  return result as RenderResult;
}
