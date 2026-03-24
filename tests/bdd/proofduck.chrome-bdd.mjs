import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';

import {
  EXTENSION_ID,
  cleanupExtensionContext,
  gotoWithRetry,
  launchExtensionContext,
  openExtensionSidepanel,
} from './browser-session.mjs';
const EMPTY_DRAFT_SENTINEL = { __proofduckEmptyDraft: true };

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : null;
}

async function clearSelection(page) {
  await page.evaluate(() => {
    window.getSelection()?.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
}

async function clickButtonInsidePage(page, label) {
  await page.evaluate((buttonLabel) => {
    const buttons = [...document.querySelectorAll('button')];
    const target = buttons.find((button) => button.textContent?.trim() === buttonLabel);
    if (!(target instanceof HTMLButtonElement)) {
      throw new Error(`Button not found: ${buttonLabel}`);
    }

    target.click();
  }, label);
}

async function fillSettings(sidepanel, apiBase) {
  await sidepanel.getByRole('button', { name: '设置' }).click();
  await sidepanel.locator('select').nth(1).selectOption('online');
  await sidepanel.getByPlaceholder('https://example.com/v1').fill(`${apiBase}/v1`);
  await sidepanel.getByPlaceholder('sk-...').fill('test-key');
  await sidepanel.getByPlaceholder('gpt-like-model').fill('demo-model');
  await sidepanel.getByRole('button', { name: '关闭' }).click();
}

async function openSettings(sidepanel) {
  await sidepanel.getByRole('button', { name: '设置' }).click();
}

async function clearOnlineSettings(sidepanel) {
  await sidepanel.getByPlaceholder('https://example.com/v1').fill('');
  await sidepanel.getByPlaceholder('sk-...').fill('');
  await sidepanel.getByPlaceholder('gpt-like-model').fill('');
}

async function selectSampleText(page) {
  await page.locator('#sample').selectText();
  const trigger = page.locator('[data-proofduck-trigger="true"]');
  await trigger.waitFor({ state: 'visible', timeout: 15000 });
  return trigger;
}

async function selectSecondSampleText(page) {
  await page.locator('#sample-two').selectText();
  const trigger = page.locator('[data-proofduck-trigger="true"]');
  await trigger.waitFor({ state: 'visible', timeout: 15000 });
  return trigger;
}

async function setTestEngineOverride(sidepanel, options) {
  await sidepanel.evaluate((override) => {
    const scoped = globalThis;
    scoped.__PROOFDUCK_TEST_ENGINE_OVERRIDE__ = async (engine) => {
      if (!override || engine !== override.engine) {
        return null;
      }

      return {
        result: override.result,
        notice: override.notice,
        engine: override.engine,
        localRuntime: override.localRuntime,
        fallbackUsed: override.fallbackUsed,
      };
    };
  }, options);

  await sidepanel.evaluate(async (override) => {
    await browser.storage.local.set({
      'proofduck:test-engine-override': override,
    });
  }, options);
}

async function clearTestEngineOverride(sidepanel) {
  await sidepanel.evaluate(() => {
    const scoped = globalThis;
    delete scoped.__PROOFDUCK_TEST_ENGINE_OVERRIDE__;
  });

  await sidepanel.evaluate(async () => {
    await browser.storage.local.remove('proofduck:test-engine-override');
  });
}

async function setPanelOnlyTestEngineOverride(sidepanel, options) {
  await sidepanel.evaluate((override) => {
    const scoped = globalThis;
    scoped.__PROOFDUCK_TEST_ENGINE_OVERRIDE__ = async (engine) => {
      if (!override || engine !== override.engine) {
        return null;
      }

      return {
        result: override.result,
        notice: override.notice,
        engine: override.engine,
        localRuntime: override.localRuntime,
        fallbackUsed: override.fallbackUsed,
      };
    };
  }, options);
}

async function clearPanelOnlyTestEngineOverride(sidepanel) {
  await sidepanel.evaluate(() => {
    const scoped = globalThis;
    delete scoped.__PROOFDUCK_TEST_ENGINE_OVERRIDE__;
  });
}

async function setTestPageDraftResponse(sidepanel, payload) {
  await sidepanel.evaluate(async (draft) => {
    const key = 'proofduck:test-page-draft-response';
    await browser.storage.local.set({
      [key]: draft,
    });

    const startedAt = Date.now();
    while (Date.now() - startedAt < 1500) {
      const current = await browser.storage.local.get(key);
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }, payload === null ? EMPTY_DRAFT_SENTINEL : payload);

  await sidepanel.waitForTimeout(60);
}

async function clearTestPageDraftResponse(sidepanel) {
  await sidepanel.evaluate(async () => {
    const key = 'proofduck:test-page-draft-response';
    await browser.storage.local.remove(key);

    const startedAt = Date.now();
    while (Date.now() - startedAt < 1500) {
      const current = await browser.storage.local.get(key);
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  });

  await sidepanel.waitForTimeout(60);
}

async function setTestSelectionDraftResponse(sidepanel, payload) {
  await sidepanel.evaluate(async (draft) => {
    const key = 'proofduck:test-selection-draft-response';
    await browser.storage.local.set({
      [key]: draft,
    });

    const startedAt = Date.now();
    while (Date.now() - startedAt < 1500) {
      const current = await browser.storage.local.get(key);
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }, payload === null ? EMPTY_DRAFT_SENTINEL : payload);

  await sidepanel.waitForTimeout(60);
}

async function clearTestSelectionDraftResponse(sidepanel) {
  await sidepanel.evaluate(async () => {
    const key = 'proofduck:test-selection-draft-response';
    await browser.storage.local.remove(key);

    const startedAt = Date.now();
    while (Date.now() - startedAt < 1500) {
      const current = await browser.storage.local.get(key);
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  });

  await sidepanel.waitForTimeout(60);
}

async function runScenario(title, steps) {
  console.log(`\nSCENARIO: ${title}`);
  for (const step of steps) {
    console.log(`${step.kind} ${step.text}`);
    await step.run();
  }
}

async function main() {
  const rootDir = process.cwd();
  const extensionPath = path.join(rootDir, 'dist', 'chrome-mv3');
  let onlineRequestCount = 0;
  let fallbackRequestCount = 0;
  let activeUserDataDir = '';

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');

    if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
      const payload = await readJsonBody(request);
      const requestedModel = payload?.model;
      onlineRequestCount += 1;

      if (requestedModel === 'force-error-model') {
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            error: {
              message: 'forced upstream failure',
            },
          }),
        );
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [{ message: { content: 'Remote translation result' } }],
        }),
      );
      return;
    }

    if (url.pathname === '/short') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`
        <html>
          <body style="font-family:sans-serif;padding:32px">
            <p id="short">太短了。</p>
          </body>
        </html>
      `);
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`
      <html>
        <body style="font-family:sans-serif;padding:32px">
          <article>
            <h1>校对鸭 BDD</h1>
            <p id="sample">
              校对鸭是一个面向网页阅读与写作场景的助手，它帮助用户在浏览流程里完成翻译、摘要、校对、润色和扩写。
            </p>
            <p id="sample-two">
              第二段内容用来验证新的选区状态是否会正确重置。
            </p>
          </article>
        </body>
      </html>
    `);
  });

  try {
    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve(undefined)));
    });

    const address = server.address();
    assert(address && typeof address !== 'string', '本地测试服务启动失败');
    const sampleUrl = `http://127.0.0.1:${address.port}/`;

    const launched = await launchExtensionContext({
      browser: 'chromium',
      extensionPath,
      headless: false,
      enableWebGpu: false,
      label: 'proofduck-bdd',
    });
    const context = launched.context;
    activeUserDataDir = launched.userDataDir;
    let sidepanel = await openExtensionSidepanel(context, EXTENSION_ID);

    console.log('BDD 浏览器: chromium（单实例）');

    try {
      await context.route('https://translate.googleapis.com/**', async (route) => {
        fallbackRequestCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([[['推理']]]),
        });
      });

      await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);

      const page = await context.newPage();
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: sampleUrl,
      });
      await page.goto(sampleUrl);
      await page.waitForLoadState('networkidle');

      await runScenario('悬停翻译会同步到侧边栏，并且不重复请求', [
        {
          kind: 'GIVEN',
          text: '用户已经打开侧边栏，并配置了在线翻译',
          run: async () => {
            await sidepanel.bringToFront();
            await sidepanel.locator('textarea').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户在网页里选中文字并悬停在 🐣 上',
          run: async () => {
            await page.bringToFront();
            const trigger = await selectSampleText(page);
            await trigger.hover();
          },
        },
        {
          kind: 'THEN',
          text: '页内卡片和侧边栏都显示同一份翻译结果与同一条引擎，并且只请求一次在线接口',
          run: async () => {
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await page.getByText('在线 AI').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('在线 AI').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === 1, `期望只请求一次在线翻译，实际是 ${onlineRequestCount} 次`);
            assert(fallbackRequestCount === 0, `期望没有触发翻译兜底，实际是 ${fallbackRequestCount} 次`);
          },
        },
      ]);

      await runScenario('翻译卡片会在关闭、点空白后消失，点击 Copy 时保持打开', [
        {
          kind: 'GIVEN',
          text: '翻译卡片已经出现',
          run: async () => {
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击关闭按钮',
          run: async () => {
            await page.getByRole('button', { name: '关闭翻译弹窗' }).click();
          },
        },
        {
          kind: 'THEN',
          text: '翻译卡片会消失',
          run: async () => {
            await page.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户再次悬停并点击 Copy',
          run: async () => {
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await page.getByRole('button', { name: 'Copy' }).click();
          },
        },
        {
          kind: 'THEN',
          text: '剪贴板会写入译文，而且翻译卡片保持打开',
          run: async () => {
            const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
            assert(clipboardText === 'Remote translation result', `复制后的剪贴板内容不对，当前是：${clipboardText}`);
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户第三次悬停并点击页面空白位置',
          run: async () => {
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await page.mouse.click(20, 20);
          },
        },
        {
          kind: 'THEN',
          text: '翻译卡片仍然会消失',
          run: async () => {
            await page.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });
          },
        },
      ]);

      await runScenario('点击 🐣 会把选区送入侧边栏翻译页，并复用刚才的结果', [
        {
          kind: 'GIVEN',
          text: '用户已经对这段选区做过一次悬停翻译',
          run: async () => {
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击 🐣',
          run: async () => {
            await page.locator('[data-proofduck-trigger="true"]').click();
          },
        },
        {
          kind: 'THEN',
          text: '侧边栏会带入选区并直接显示同一份翻译结果，不会再次请求在线接口',
          run: async () => {
            const importedText = await sidepanel.locator('textarea').inputValue();
            assert(importedText.includes('校对鸭是一个面向网页阅读与写作场景的助手'), '侧边栏没有带入选区内容');
            await sidepanel.getByRole('heading', { name: 'TRANSLATION' }).waitFor({ timeout: 10000 });
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === 1, `点击 🐣 后不应重复翻译，实际请求 ${onlineRequestCount} 次`);
          },
        },
      ]);

      await runScenario('导入选区与抓取全文按钮都能把内容带入原文框，并清空旧结果', [
        {
          kind: 'GIVEN',
          text: '网页里有新的选区，侧边栏已经打开',
          run: async () => {
            await setTestSelectionDraftResponse(sidepanel, { text: '第二段内容用来验证新的选区状态是否会正确重置' });
            await sidepanel.bringToFront();
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击导入选区',
          run: async () => {
            await clickButtonInsidePage(sidepanel, '导入选区');
          },
        },
        {
          kind: 'THEN',
          text: '原文框会显示当前选区，且旧的处理结果会被清空',
          run: async () => {
            const text = await sidepanel.locator('textarea').inputValue();
            assert(text.includes('第二段内容用来验证新的选区状态是否会正确重置'), '导入选区没有成功带入新内容');
            await sidepanel.getByText('Result will appear here.').waitFor({ timeout: 10000 });
            await clearTestSelectionDraftResponse(sidepanel);
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击抓取全文',
          run: async () => {
            await setTestPageDraftResponse(sidepanel, { text: '翻译、摘要、校对、润色和扩写' });
            await clickButtonInsidePage(sidepanel, '抓取全文');
          },
        },
        {
          kind: 'THEN',
          text: '原文框会显示整页全文，且处理结果保持清空状态',
          run: async () => {
            const text = await sidepanel.locator('textarea').inputValue();
            assert(text.includes('翻译、摘要、校对、润色和扩写'), '抓取全文没有成功带入内容');
            await sidepanel.getByText('Result will appear here.').waitFor({ timeout: 10000 });
            await clearTestPageDraftResponse(sidepanel);
          },
        },
      ]);

      await runScenario('导入选区失败时会提示用户，并保留原文内容', [
        {
          kind: 'GIVEN',
          text: '侧边栏里已经有原文，同时当前页面没有任何选区',
          run: async () => {
            await sidepanel.bringToFront();
            await sidepanel.locator('textarea').fill('这段原文需要继续保留');
            await page.bringToFront();
            await clearSelection(page);
            await sidepanel.bringToFront();
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击导入选区',
          run: async () => {
            await clickButtonInsidePage(sidepanel, '导入选区');
          },
        },
        {
          kind: 'THEN',
          text: '界面会提示当前页面没有可导入的选区，原文内容保持不变',
          run: async () => {
            await sidepanel.getByText('当前页面没有可导入的选区').waitFor({ timeout: 10000 });
            const text = await sidepanel.locator('textarea').inputValue();
            assert(text === '这段原文需要继续保留', `导入选区失败后不应覆盖原文，当前内容是：${text}`);
          },
        },
      ]);

      await runScenario('抓取全文失败时会提示用户，并保留原文内容', [
        {
          kind: 'GIVEN',
          text: '侧边栏里已经有原文，同时当前页面没有可抓取的全文',
          run: async () => {
            await page.bringToFront();
            await page.goto(`http://127.0.0.1:${address.port}/short`);
            await page.waitForLoadState('networkidle');
            await sidepanel.bringToFront();
            await sidepanel.locator('textarea').fill('这段原文需要保留');
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击抓取全文',
          run: async () => {
            await clickButtonInsidePage(sidepanel, '抓取全文');
          },
        },
        {
          kind: 'THEN',
          text: '界面会提示当前页面没有可抓取的全文，原文内容保持不变',
          run: async () => {
            await sidepanel.getByText('当前页面没有可抓取的全文').waitFor({ timeout: 10000 });
            const text = await sidepanel.locator('textarea').inputValue();
            assert(text === '这段原文需要保留', `抓取全文失败后不应覆盖原文，当前内容是：${text}`);
          },
        },
      ]);

      await runScenario('五种处理模式都能在侧边栏产生结果', [
        {
          kind: 'GIVEN',
          text: '侧边栏里已经有可处理的内容',
          run: async () => {
            await sidepanel.locator('textarea').fill('这段内容需要整理表达，让信息更清楚。');
          },
        },
        {
          kind: 'WHEN',
          text: '用户依次执行翻译、摘要、校对、润色、扩写',
          run: async () => {
            const modes = [
              { tab: '翻译', action: '执行翻译', title: 'TRANSLATION' },
              { tab: '摘要', action: '执行摘要', title: 'SUMMARY' },
              { tab: '校对', action: '执行校对', title: 'CORRECTION' },
              { tab: '润色', action: '执行润色', title: 'POLISH' },
              { tab: '扩写', action: '执行扩写', title: 'EXPANSION' },
            ];

            for (const item of modes) {
              await sidepanel.getByRole('button', { name: item.tab, exact: true }).click();
              await sidepanel.getByRole('heading', { name: item.title }).waitFor({ timeout: 10000 });
              await sidepanel.getByRole('button', { name: item.action }).click();
              const resultText = await sidepanel.locator('section').nth(1).textContent();
              assert(resultText && !resultText.includes('Result will appear here.'), `${item.tab} 没有产生结果`);
            }
          },
        },
        {
          kind: 'THEN',
          text: '结果区会持续显示真实结果，而不是空白占位',
          run: async () => {
            const resultText = await sidepanel.locator('section').nth(1).textContent();
            assert(resultText && !resultText.includes('Result will appear here.'), '结果区仍然是空状态');
          },
        },
      ]);

      await runScenario('切换首选策略时，只显示对应设置区块', [
        {
          kind: 'GIVEN',
          text: '用户打开设置面板',
          run: async () => {
            await sidepanel.getByRole('button', { name: '设置' }).click();
          },
        },
        {
          kind: 'WHEN',
          text: '用户把首选策略切到浏览器内置 AI',
          run: async () => {
            await sidepanel.locator('select').nth(1).selectOption('chrome-ai');
          },
        },
        {
          kind: 'THEN',
          text: '本地模型和在线 LLM API 区块会隐藏，只保留翻译服务相关设置',
          run: async () => {
            await sidepanel.getByRole('heading', { name: '本地模型' }).waitFor({ state: 'hidden', timeout: 10000 });
            await sidepanel.getByRole('heading', { name: '在线 LLM API' }).waitFor({ state: 'hidden', timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户把首选策略切回自动优先',
          run: async () => {
            await sidepanel.locator('select').nth(1).selectOption('auto');
          },
        },
        {
          kind: 'THEN',
          text: '本地模型和在线 LLM API 区块会重新出现',
          run: async () => {
            await sidepanel.getByRole('heading', { name: '本地模型' }).waitFor({ timeout: 10000 });
            await sidepanel.getByRole('heading', { name: '在线 LLM API' }).waitFor({ timeout: 10000 });
            await sidepanel.getByRole('button', { name: '关闭' }).click();
          },
        },
      ]);

      await runScenario('设置页会直接显示官方模型推荐和官方数量', [
        {
          kind: 'GIVEN',
          text: '用户保持自动优先，并打开设置面板里的本地模型区块',
          run: async () => {
            await sidepanel.getByRole('button', { name: '设置' }).click();
            await sidepanel.locator('select').nth(1).selectOption('auto');
            await sidepanel.getByRole('heading', { name: '本地模型' }).waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'THEN',
          text: '界面会直接显示官方模型总数和推荐模型，不再卡在加载提示',
          run: async () => {
            await sidepanel.getByText(/官方共 \d+ 个/).waitFor({ timeout: 10000 });
            await sidepanel.getByRole('button', { name: /Llama-3.2-1B-Instruct-q4f16_1-MLC/ }).waitFor({ timeout: 10000 });
            assert((await sidepanel.getByText('正在加载官方列表').count()) === 0, '设置页不应继续显示“正在加载官方列表”');
            assert((await sidepanel.getByText('正在读取 web-llm 官方模型列表。').count()) === 0, '设置页不应继续显示旧的读取提示');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
          },
        },
      ]);

      await runScenario('在线接口未配置时会给出明确提示', [
        {
          kind: 'GIVEN',
          text: '用户打开设置面板，并且准备只走在线接口',
          run: async () => {
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(1).selectOption('online');
            await sidepanel.getByPlaceholder('https://example.com/v1').fill('');
            await sidepanel.getByPlaceholder('sk-...').fill('');
            await sidepanel.getByPlaceholder('gpt-like-model').fill('');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
          },
        },
        {
          kind: 'WHEN',
          text: '用户输入文本并执行翻译',
          run: async () => {
            await sidepanel.locator('textarea').fill('请帮我翻译这句话。');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
          },
        },
        {
          kind: 'THEN',
          text: '界面会给出在线接口未配置的明确提示',
          run: async () => {
            await sidepanel.getByText('处理失败：online: 在线 API 未配置').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'AND',
          text: '用户重新补全在线设置后，可以继续后面的场景',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
          },
        },
      ]);

      await runScenario('清空原文和清空结果互不影响', [
        {
          kind: 'GIVEN',
          text: '侧边栏已经有原文和处理结果',
          run: async () => {
            await sidepanel.locator('textarea').fill('这是一段需要翻译的内容。');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户先清空原文',
          run: async () => {
            await sidepanel.getByRole('button', { name: '清空' }).nth(0).click();
          },
        },
        {
          kind: 'THEN',
          text: '原文框会清空，但结果仍然保留',
          run: async () => {
            const sourceValue = await sidepanel.locator('textarea').inputValue();
            assert(sourceValue === '', '清空原文后，输入框没有被清空');
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户再清空结果',
          run: async () => {
            await sidepanel.getByRole('button', { name: '清空' }).nth(1).click();
          },
        },
        {
          kind: 'THEN',
          text: '结果区会恢复为空状态，但不会报错',
          run: async () => {
            await sidepanel.getByText('Result will appear here.').waitFor({ timeout: 10000 });
          },
        },
      ]);

      await runScenario('设置在重新打开侧边栏后仍然保留', [
        {
          kind: 'GIVEN',
          text: '用户修改了目标语言、首选策略和在线模型名',
          run: async () => {
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('日本語');
            await sidepanel.locator('select').nth(1).selectOption('online');
            await sidepanel.getByPlaceholder('https://example.com/v1').fill(`http://127.0.0.1:${address.port}/v1`);
            await sidepanel.getByPlaceholder('sk-...').fill('persist-key');
            await sidepanel.getByPlaceholder('gpt-like-model').fill('persist-model');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
          },
        },
        {
          kind: 'WHEN',
          text: '用户重新打开侧边栏设置',
          run: async () => {
            await sidepanel.reload();
            await sidepanel.waitForLoadState('networkidle');
            await openSettings(sidepanel);
          },
        },
        {
          kind: 'THEN',
          text: '刚才修改过的设置仍然保留',
          run: async () => {
            const targetLanguage = await sidepanel.locator('select').nth(0).inputValue();
            const enginePreference = await sidepanel.locator('select').nth(1).inputValue();
            const apiBase = await sidepanel.getByPlaceholder('https://example.com/v1').inputValue();
            const apiKey = await sidepanel.getByPlaceholder('sk-...').inputValue();
            const modelName = await sidepanel.getByPlaceholder('gpt-like-model').inputValue();

            assert(targetLanguage === '日本語', `目标语言没有保留，当前是 ${targetLanguage}`);
            assert(enginePreference === 'online', `首选策略没有保留，当前是 ${enginePreference}`);
            assert(apiBase === `http://127.0.0.1:${address.port}/v1`, `在线地址没有保留，当前是 ${apiBase}`);
            assert(apiKey === 'persist-key', `在线密钥没有保留，当前是 ${apiKey}`);
            assert(modelName === 'persist-model', `在线模型没有保留，当前是 ${modelName}`);
            await sidepanel.getByRole('button', { name: '关闭' }).click();
          },
        },
      ]);

      await runScenario('同一段文字在设置切换后不会误用旧翻译结果', [
        {
          kind: 'GIVEN',
          text: '用户先在侧边栏里用在线接口对同一段文字完成一次翻译',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户清空在线接口配置后，再次对同一段文字执行翻译',
          run: async () => {
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(1).selectOption('online');
            await clearOnlineSettings(sidepanel);
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
          },
        },
        {
          kind: 'THEN',
          text: '界面会显示新的失败提示，而不是继续复用旧的在线结果',
          run: async () => {
            await sidepanel.getByText('处理失败：online: 在线 API 未配置').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });
          },
        },
        {
          kind: 'AND',
          text: '用户重新补全在线配置，后续场景可继续使用',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
          },
        },
      ]);

      await runScenario('策略切换后会使用新的实际引擎', [
        {
          kind: 'GIVEN',
          text: '同一段文字先按在线接口策略翻译成功',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('在线 AI').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline + 1, '在线策略没有走新的在线请求');
          },
        },
        {
          kind: 'WHEN',
          text: '用户切到本地模型，并提供一个可用的本地 GPU 结果',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await setTestEngineOverride(sidepanel, {
              engine: 'local',
              result: 'Local GPU translation result',
              notice: '已使用本地 WebGPU 模型',
              localRuntime: 'webgpu',
              fallbackUsed: false,
            });
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(1).selectOption('local');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            assert(onlineRequestCount === onlineBaseline, `切到本地模型后不应继续请求在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '结果会换成本地 GPU 返回的内容，并显示新的来源',
          run: async () => {
            await sidepanel.getByText('Local GPU translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('本地 AI（GPU）').waitFor({ timeout: 10000 });
            await clearTestEngineOverride(sidepanel);
          },
        },
      ]);

      await runScenario('同一段文字连续悬停时不会重复请求翻译', [
        {
          kind: 'GIVEN',
          text: '用户已经对当前选区成功翻译过一次',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
            await page.bringToFront();
            await page.goto(sampleUrl);
            await page.waitForLoadState('networkidle');
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'WHEN',
          text: '用户移开后再次悬停同一段文字',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await page.mouse.move(20, 20);
            await page.getByText('Remote translation result').waitFor({ state: 'hidden', timeout: 10000 });
            const trigger = page.locator('[data-proofduck-trigger="true"]');
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline, `重复悬停同一段时不应重复请求，实际请求增加到 ${onlineRequestCount}`);
          },
        },
        {
          kind: 'THEN',
          text: '页内卡片会直接复用已有结果',
          run: async () => {
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
      ]);

      await runScenario('切换到新的选区后，触发图标会恢复成 🐣', [
        {
          kind: 'GIVEN',
          text: '上一段选区已经翻译成功，触发图标处于 🐥 状态',
          run: async () => {
            await page.bringToFront();
            await page.goto(sampleUrl);
            await page.waitForLoadState('networkidle');
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await trigger.waitFor({ timeout: 10000 });
            assert((await trigger.textContent())?.trim() === '🐥', '翻译成功后图标没有变成 🐥');
          },
        },
        {
          kind: 'WHEN',
          text: '用户改选第二段新文字',
          run: async () => {
            await page.mouse.move(20, 20);
            await clearSelection(page);
            await selectSecondSampleText(page);
          },
        },
        {
          kind: 'THEN',
          text: '新的触发图标会恢复成 🐣',
          run: async () => {
            const trigger = page.locator('[data-proofduck-trigger="true"]');
            await trigger.waitFor({ timeout: 10000 });
            assert((await trigger.textContent())?.trim() === '🐣', '切换新选区后图标没有恢复成 🐣');
          },
        },
      ]);

      await runScenario('没有选区时导入选区不会覆盖现有原文', [
        {
          kind: 'GIVEN',
          text: '侧边栏原文框里已经有手动输入内容',
          run: async () => {
            await sidepanel.bringToFront();
            await sidepanel.locator('textarea').fill('保留这段手动输入内容');
            await page.bringToFront();
            await clearSelection(page);
            await sidepanel.bringToFront();
          },
        },
        {
          kind: 'WHEN',
          text: '用户在没有选区时点击导入选区',
          run: async () => {
            await clickButtonInsidePage(sidepanel, '导入选区');
          },
        },
        {
          kind: 'THEN',
          text: '原文框会保持原来的内容，不会被旧选区覆盖',
          run: async () => {
            const text = await sidepanel.locator('textarea').inputValue();
            assert(text === '保留这段手动输入内容', `没有选区时不应覆盖原文，当前内容是：${text}`);
          },
        },
      ]);

      await runScenario('在线接口失败后会自动回退到翻译服务', [
        {
          kind: 'GIVEN',
          text: '用户明确切到在线接口，并故意把在线模型设成会失败的模型',
          run: async () => {
            await setTestEngineOverride(sidepanel, {
              engine: 'fallback',
              result: '推理',
              notice: '已使用第三方免费翻译兜底',
              localRuntime: null,
              fallbackUsed: true,
            });
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('中文');
            await sidepanel.locator('select').nth(1).selectOption('online');
            await sidepanel.getByPlaceholder('https://example.com/v1').fill(`http://127.0.0.1:${address.port}/v1`);
            await sidepanel.getByPlaceholder('sk-...').fill('test-key');
            await sidepanel.getByPlaceholder('gpt-like-model').fill('force-error-model');
            await sidepanel.locator('input[type="checkbox"]').nth(0).check();
            await sidepanel.getByRole('button', { name: '关闭' }).click();
          },
        },
        {
          kind: 'WHEN',
          text: '用户执行翻译',
          run: async () => {
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
          },
        },
        {
          kind: 'THEN',
          text: '界面会回退到翻译服务，并显示翻译服务来源',
          run: async () => {
            await sidepanel.getByText('翻译服务').waitFor({ timeout: 10000 });
            const resultText = (await sidepanel.locator('[data-proofduck-result-text="true"]').innerText()).trim();
            assert(resultText && resultText !== 'Result will appear here.', '翻译服务没有产出可见结果');
          },
        },
        {
          kind: 'AND',
          text: '用户重新补回正常在线模型，后续场景可继续使用',
          run: async () => {
            await clearTestEngineOverride(sidepanel);
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
          },
        },
      ]);

      await runScenario('页面重新加载后，悬停翻译仍然可用', [
        {
          kind: 'GIVEN',
          text: '当前页面已经配置好可用的在线翻译',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
            await page.bringToFront();
            await page.goto(sampleUrl);
            await page.waitForLoadState('networkidle');
          },
        },
        {
          kind: 'WHEN',
          text: '用户重新加载页面后再次选区并悬停',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline + 1, `页面重载后悬停翻译没有重新请求，当前请求数 ${onlineRequestCount}`);
          },
        },
        {
          kind: 'THEN',
          text: '页内翻译卡片和侧边栏仍然能正常显示结果',
          run: async () => {
            await page.getByText('Remote translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
      ]);

      await runScenario('清空选区后，页内触发图标会隐藏', [
        {
          kind: 'GIVEN',
          text: '页面上已经因为选区显示了触发图标',
          run: async () => {
            await page.bringToFront();
            await page.goto(sampleUrl);
            await page.waitForLoadState('networkidle');
            await page.mouse.move(20, 20);
            await clearSelection(page);
            await selectSampleText(page);
          },
        },
        {
          kind: 'WHEN',
          text: '用户清空当前选区',
          run: async () => {
            await clearSelection(page);
          },
        },
        {
          kind: 'THEN',
          text: '页内触发图标会隐藏',
          run: async () => {
            await page.locator('[data-proofduck-trigger="true"]').waitFor({ state: 'hidden', timeout: 10000 });
          },
        },
      ]);

      await runScenario('侧边栏关闭时点击 🐣，重新打开后仍能恢复选区内容', [
        {
          kind: 'GIVEN',
          text: '侧边栏页面已经关闭，用户重新在网页里选中一段文字',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
            await sidepanel.close();
            await page.bringToFront();
            await page.goto(sampleUrl);
            await page.waitForLoadState('networkidle');
            await page.mouse.move(20, 20);
            await clearSelection(page);
            await selectSecondSampleText(page);
          },
        },
        {
          kind: 'WHEN',
          text: '用户点击 🐣，之后再手动打开侧边栏',
          run: async () => {
            await page.locator('[data-proofduck-trigger="true"]').click();
            sidepanel = await context.newPage();
            await gotoWithRetry(sidepanel, `chrome-extension://${EXTENSION_ID}/sidepanel.html`);
            await sidepanel.waitForLoadState('networkidle');
          },
        },
        {
          kind: 'THEN',
          text: '侧边栏会恢复刚才的选区内容，并自动完成翻译',
          run: async () => {
            const text = await sidepanel.locator('textarea').inputValue();
            assert(text.includes('第二段内容用来验证新的选区状态是否会正确重置'), '侧边栏重新打开后没有恢复刚才的选区内容');
            await sidepanel.getByText('Remote translation result').waitFor({ timeout: 10000 });
          },
        },
      ]);

      await runScenario('当当前策略彻底不可用时，界面会明确提示失败', [
        {
          kind: 'GIVEN',
          text: '用户明确切到在线接口，清空配置并关闭翻译兜底，同时结果区里还有上一轮结果',
          run: async () => {
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('中文');
            await sidepanel.locator('select').nth(1).selectOption('online');
            await clearOnlineSettings(sidepanel);
            await sidepanel.locator('input[type="checkbox"]').nth(0).uncheck();
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.locator('textarea').fill('保留这段旧结果');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
          },
        },
        {
          kind: 'WHEN',
          text: '用户执行翻译',
          run: async () => {
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
          },
        },
        {
          kind: 'THEN',
          text: '界面会显示明确的失败提示，不会保留旧结果',
          run: async () => {
            await sidepanel.getByText(/处理失败：/).waitFor({ timeout: 10000 });
            await sidepanel.getByText('Result will appear here.').waitFor({ timeout: 10000 });
          },
        },
        {
          kind: 'AND',
          text: '用户重新补回在线设置，后续场景可继续使用',
          run: async () => {
            await fillSettings(sidepanel, `http://127.0.0.1:${address.port}`);
          },
        },
      ]);

      await context.addInitScript(() => {
        class FakeLanguageModelSession {
          async prompt() {
            return 'Browser AI translation result';
          }

          destroy() {}
        }

        class FakeLanguageModel {
          static async availability() {
            return 'available';
          }

          static async create() {
            return new FakeLanguageModelSession();
          }
        }

        Object.defineProperty(globalThis, 'LanguageModel', {
          configurable: true,
          value: FakeLanguageModel,
        });
      });

      await sidepanel.close();
      sidepanel = await context.newPage();
      await gotoWithRetry(sidepanel, `chrome-extension://${EXTENSION_ID}/sidepanel.html`);
      await sidepanel.waitForLoadState('networkidle');

      await runScenario('明确选择浏览器 AI 时，会显示浏览器 AI 结果与来源', [
        {
          kind: 'GIVEN',
          text: '侧边栏已经注入可用的浏览器 AI，并把首选策略切到浏览器 AI',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('日本語');
            await sidepanel.locator('select').nth(1).selectOption('chrome-ai');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('Browser AI translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline, `浏览器 AI 成功时不应走在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '结果区会显示浏览器 AI 的结果与来源',
          run: async () => {
            await sidepanel.getByText('浏览器 AI').waitFor({ timeout: 10000 });
          },
        },
      ]);

      await runScenario('明确选择浏览器 AI 但目标语言不支持时，会明确失败且不会偷切别的路线', [
        {
          kind: 'GIVEN',
          text: '用户仍然保持浏览器 AI 策略，但把目标语言改成当前不支持的中文',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('中文');
            await sidepanel.locator('select').nth(1).selectOption('chrome-ai');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('处理失败：chrome-ai: 浏览器内置 AI 当前只支持英文、西班牙语、日语输出').waitFor({
              timeout: 10000,
            });
            assert(onlineRequestCount === onlineBaseline, `浏览器 AI 失败时不应偷偷切到在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '界面会明确显示失败，并清空旧结果',
          run: async () => {
            await sidepanel.getByText('Result will appear here.').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Browser AI translation result').waitFor({ state: 'hidden', timeout: 10000 });
          },
        },
      ]);

      await runScenario('明确选择本地模型且可用 GPU 时，会显示本地 GPU 结果与来源', [
        {
          kind: 'GIVEN',
          text: '用户切到本地模型，并在测试里提供一个可用的本地 GPU 结果',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await setTestEngineOverride(sidepanel, {
              engine: 'local',
              result: 'Local GPU translation result',
              notice: '已使用本地 WebGPU 模型',
              localRuntime: 'webgpu',
              fallbackUsed: false,
            });
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('中文');
            await sidepanel.locator('select').nth(1).selectOption('local');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '翻译', exact: true }).click();
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('Local GPU translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline, `本地 GPU 成功时不应走在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '结果区会显示本地 GPU 的结果与来源',
          run: async () => {
            await sidepanel.getByText('本地 AI（GPU）').waitFor({ timeout: 10000 });
            await clearTestEngineOverride(sidepanel);
          },
        },
      ]);

      await runScenario('明确选择本地模型且只有兼容模式时，会显示本地兼容结果与来源', [
        {
          kind: 'GIVEN',
          text: '用户继续保持本地模型策略，并在测试里提供一个本地兼容模式结果',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await setTestEngineOverride(sidepanel, {
              engine: 'local',
              result: 'Local WASM translation result',
              notice: '已使用本地 WASM 模型（Xenova/t5-small）',
              localRuntime: 'wasm',
              fallbackUsed: true,
            });
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(1).selectOption('local');
            await sidepanel.locator('input[type="checkbox"]').nth(0).check();
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await sidepanel.locator('textarea').fill('inference');
            await sidepanel.getByRole('button', { name: '执行翻译' }).click();
            await sidepanel.getByText('Local WASM translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline, `本地兼容模式成功时不应走在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '结果区会显示本地兼容模式的结果与来源',
          run: async () => {
            await sidepanel.getByText('本地 AI（兼容）').waitFor({ timeout: 10000 });
            await clearTestEngineOverride(sidepanel);
          },
        },
      ]);

      await runScenario('页内翻译卡片在本地 GPU 策略下，会显示本地 GPU 结果并同步到侧边栏', [
        {
          kind: 'GIVEN',
          text: '用户保持本地模型策略，并给页内翻译准备一份本地 GPU 结果',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await setTestEngineOverride(sidepanel, {
              engine: 'local',
              result: 'Inline local GPU translation result',
              notice: '已使用本地 WebGPU 模型',
              localRuntime: 'webgpu',
              fallbackUsed: false,
            });
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(0).selectOption('中文');
            await sidepanel.locator('select').nth(1).selectOption('local');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await page.bringToFront();
            await page.goto(sampleUrl);
            await page.waitForLoadState('networkidle');
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
            await page.getByText('Inline local GPU translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline, `页内本地 GPU 翻译不应走在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '页内卡片和侧边栏都会显示本地 GPU 结果与来源',
          run: async () => {
            await page.getByText('本地 AI（GPU）').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Inline local GPU translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('本地 AI（GPU）').waitFor({ timeout: 10000 });
            await clearTestEngineOverride(sidepanel);
          },
        },
      ]);

      await runScenario('页内翻译卡片在本地兼容策略下，会显示本地兼容结果并同步到侧边栏', [
        {
          kind: 'GIVEN',
          text: '用户继续保持本地模型策略，并给页内翻译准备一份本地兼容模式结果',
          run: async () => {
            const onlineBaseline = onlineRequestCount;
            await setTestEngineOverride(sidepanel, {
              engine: 'local',
              result: 'Inline local WASM translation result',
              notice: '已使用本地 WASM 模型（Xenova/t5-small）',
              localRuntime: 'wasm',
              fallbackUsed: true,
            });
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(1).selectOption('local');
            await sidepanel.locator('input[type="checkbox"]').nth(0).check();
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await page.bringToFront();
            await page.mouse.move(20, 20);
            await clearSelection(page);
            const trigger = await selectSecondSampleText(page);
            await trigger.hover();
            await page.getByText('Inline local WASM translation result').waitFor({ timeout: 10000 });
            assert(onlineRequestCount === onlineBaseline, `页内本地兼容翻译不应走在线接口，实际请求 ${onlineRequestCount - onlineBaseline} 次`);
          },
        },
        {
          kind: 'THEN',
          text: '页内卡片和侧边栏都会显示本地兼容结果与来源',
          run: async () => {
            await page.getByText('本地 AI（兼容）').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Inline local WASM translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('本地 AI（兼容）').waitFor({ timeout: 10000 });
            await clearTestEngineOverride(sidepanel);
          },
        },
      ]);

      await runScenario('当侧边栏已经打开时，页内翻译卡片会复用侧边栏里的本地模型结果', [
        {
          kind: 'GIVEN',
          text: '用户保持本地模型策略，并且只有侧边栏这边有本地 GPU 结果',
          run: async () => {
            await clearTestEngineOverride(sidepanel);
            await openSettings(sidepanel);
            await sidepanel.locator('select').nth(1).selectOption('local');
            await sidepanel.getByRole('button', { name: '关闭' }).click();
            await setPanelOnlyTestEngineOverride(sidepanel, {
              engine: 'local',
              result: 'Panel-local translation result',
              notice: '已使用本地 WebGPU 模型',
              localRuntime: 'webgpu',
              fallbackUsed: false,
            });
          },
        },
        {
          kind: 'WHEN',
          text: '用户在网页里重新选区并悬停 🐣',
          run: async () => {
            await page.bringToFront();
            await clearSelection(page);
            const trigger = await selectSampleText(page);
            await trigger.hover();
          },
        },
        {
          kind: 'THEN',
          text: '页内卡片和侧边栏都会显示同一份侧边栏本地结果，而不是继续提示准备中',
          run: async () => {
            await page.getByText('Panel-local translation result').waitFor({ timeout: 10000 });
            await page.getByText('本地 AI（GPU）').waitFor({ timeout: 10000 });
            await sidepanel.getByText('Panel-local translation result').waitFor({ timeout: 10000 });
            await sidepanel.getByText('本地 AI（GPU）').waitFor({ timeout: 10000 });
            assert((await page.getByText('当前策略仍在准备中，请稍后再试，或点击 🐣 在侧边栏中继续。').count()) === 0, '页内卡片不应继续显示准备中提示');
            await clearPanelOnlyTestEngineOverride(sidepanel);
          },
        },
      ]);

      console.log('\nBDD OK');
    } finally {
      await cleanupExtensionContext(context, activeUserDataDir);
      activeUserDataDir = '';
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
