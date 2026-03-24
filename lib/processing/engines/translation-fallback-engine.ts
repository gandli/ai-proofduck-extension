import type { Settings } from '../../../entrypoints/shared/contracts';

import { processText } from '../processText';

type ExternalProvider = 'google' | 'baidu';

function mapGoogleLanguage(language: string) {
  switch (language) {
    case 'English':
      return 'en';
    case '日本語':
      return 'ja';
    case '中文':
    default:
      return 'zh-CN';
  }
}

function mapBaiduLanguage(language: string) {
  switch (language) {
    case 'English':
      return 'en';
    case '日本語':
      return 'jp';
    case '中文':
    default:
      return 'zh';
  }
}

function hasBaiduCredentials(settings: Settings) {
  return Boolean(settings.baiduTranslateAppId.trim() && settings.baiduTranslateKey.trim());
}

function getProviderOrder(settings: Settings): ExternalProvider[] {
  switch (settings.translationFallbackProvider) {
    case 'google':
      return ['google'];
    case 'baidu':
      return hasBaiduCredentials(settings) ? ['baidu'] : [];
    case 'auto':
    default:
      return hasBaiduCredentials(settings) ? ['google', 'baidu'] : ['google'];
  }
}

function toHex(value: number) {
  let output = '';
  for (let index = 0; index < 4; index += 1) {
    output += (`0${((value >> (index * 8)) & 255).toString(16)}`).slice(-2);
  }
  return output;
}

function add32(a: number, b: number) {
  return (a + b) & 0xffffffff;
}

function rotateLeft(value: number, shift: number) {
  return (value << shift) | (value >>> (32 - shift));
}

function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
  return add32(rotateLeft(add32(add32(a, q), add32(x, t)), s), b);
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn((b & c) | (~b & d), a, b, x, s, t);
}

function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}

function md5(input: string) {
  const bytes = Array.from(new TextEncoder().encode(input));
  const originalBitLength = bytes.length * 8;
  bytes.push(0x80);

  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  for (let index = 0; index < 8; index += 1) {
    bytes.push((originalBitLength >>> (index * 8)) & 0xff);
  }

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const block = new Array<number>(16).fill(0);
    for (let index = 0; index < 64; index += 1) {
      block[index >> 2] |= bytes[offset + index]! << ((index % 4) * 8);
    }

    const originalA = a;
    const originalB = b;
    const originalC = c;
    const originalD = d;

    a = ff(a, b, c, d, block[0]!, 7, -680876936);
    d = ff(d, a, b, c, block[1]!, 12, -389564586);
    c = ff(c, d, a, b, block[2]!, 17, 606105819);
    b = ff(b, c, d, a, block[3]!, 22, -1044525330);
    a = ff(a, b, c, d, block[4]!, 7, -176418897);
    d = ff(d, a, b, c, block[5]!, 12, 1200080426);
    c = ff(c, d, a, b, block[6]!, 17, -1473231341);
    b = ff(b, c, d, a, block[7]!, 22, -45705983);
    a = ff(a, b, c, d, block[8]!, 7, 1770035416);
    d = ff(d, a, b, c, block[9]!, 12, -1958414417);
    c = ff(c, d, a, b, block[10]!, 17, -42063);
    b = ff(b, c, d, a, block[11]!, 22, -1990404162);
    a = ff(a, b, c, d, block[12]!, 7, 1804603682);
    d = ff(d, a, b, c, block[13]!, 12, -40341101);
    c = ff(c, d, a, b, block[14]!, 17, -1502002290);
    b = ff(b, c, d, a, block[15]!, 22, 1236535329);

    a = gg(a, b, c, d, block[1]!, 5, -165796510);
    d = gg(d, a, b, c, block[6]!, 9, -1069501632);
    c = gg(c, d, a, b, block[11]!, 14, 643717713);
    b = gg(b, c, d, a, block[0]!, 20, -373897302);
    a = gg(a, b, c, d, block[5]!, 5, -701558691);
    d = gg(d, a, b, c, block[10]!, 9, 38016083);
    c = gg(c, d, a, b, block[15]!, 14, -660478335);
    b = gg(b, c, d, a, block[4]!, 20, -405537848);
    a = gg(a, b, c, d, block[9]!, 5, 568446438);
    d = gg(d, a, b, c, block[14]!, 9, -1019803690);
    c = gg(c, d, a, b, block[3]!, 14, -187363961);
    b = gg(b, c, d, a, block[8]!, 20, 1163531501);
    a = gg(a, b, c, d, block[13]!, 5, -1444681467);
    d = gg(d, a, b, c, block[2]!, 9, -51403784);
    c = gg(c, d, a, b, block[7]!, 14, 1735328473);
    b = gg(b, c, d, a, block[12]!, 20, -1926607734);

    a = hh(a, b, c, d, block[5]!, 4, -378558);
    d = hh(d, a, b, c, block[8]!, 11, -2022574463);
    c = hh(c, d, a, b, block[11]!, 16, 1839030562);
    b = hh(b, c, d, a, block[14]!, 23, -35309556);
    a = hh(a, b, c, d, block[1]!, 4, -1530992060);
    d = hh(d, a, b, c, block[4]!, 11, 1272893353);
    c = hh(c, d, a, b, block[7]!, 16, -155497632);
    b = hh(b, c, d, a, block[10]!, 23, -1094730640);
    a = hh(a, b, c, d, block[13]!, 4, 681279174);
    d = hh(d, a, b, c, block[0]!, 11, -358537222);
    c = hh(c, d, a, b, block[3]!, 16, -722521979);
    b = hh(b, c, d, a, block[6]!, 23, 76029189);
    a = hh(a, b, c, d, block[9]!, 4, -640364487);
    d = hh(d, a, b, c, block[12]!, 11, -421815835);
    c = hh(c, d, a, b, block[15]!, 16, 530742520);
    b = hh(b, c, d, a, block[2]!, 23, -995338651);

    a = ii(a, b, c, d, block[0]!, 6, -198630844);
    d = ii(d, a, b, c, block[7]!, 10, 1126891415);
    c = ii(c, d, a, b, block[14]!, 15, -1416354905);
    b = ii(b, c, d, a, block[5]!, 21, -57434055);
    a = ii(a, b, c, d, block[12]!, 6, 1700485571);
    d = ii(d, a, b, c, block[3]!, 10, -1894986606);
    c = ii(c, d, a, b, block[10]!, 15, -1051523);
    b = ii(b, c, d, a, block[1]!, 21, -2054922799);
    a = ii(a, b, c, d, block[8]!, 6, 1873313359);
    d = ii(d, a, b, c, block[15]!, 10, -30611744);
    c = ii(c, d, a, b, block[6]!, 15, -1560198380);
    b = ii(b, c, d, a, block[13]!, 21, 1309151649);
    a = ii(a, b, c, d, block[4]!, 6, -145523070);
    d = ii(d, a, b, c, block[11]!, 10, -1120210379);
    c = ii(c, d, a, b, block[2]!, 15, 718787259);
    b = ii(b, c, d, a, block[9]!, 21, -343485551);

    a = add32(a, originalA);
    b = add32(b, originalB);
    c = add32(c, originalC);
    d = add32(d, originalD);
  }

  return [toHex(a), toHex(b), toHex(c), toHex(d)].join('');
}

async function executeGoogleTranslation(text: string, settings: Settings) {
  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(mapGoogleLanguage(settings.targetLanguage))}&dt=t&q=${encodeURIComponent(text)}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as Array<Array<[string]>>;
  const translated = data?.[0]?.map((item) => item?.[0] ?? '').join('').trim();

  if (!translated) {
    throw new Error('empty translation');
  }

  return translated;
}

async function executeBaiduTranslation(text: string, settings: Settings) {
  const salt = `${Date.now()}`;
  const appId = settings.baiduTranslateAppId.trim();
  const key = settings.baiduTranslateKey.trim();
  const sign = md5(`${appId}${text}${salt}${key}`);
  const form = new URLSearchParams({
    q: text,
    from: 'auto',
    to: mapBaiduLanguage(settings.targetLanguage),
    appid: appId,
    salt,
    sign,
  });

  const response = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: form.toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    error_code?: string;
    error_msg?: string;
    trans_result?: Array<{ dst?: string }>;
  };

  if (data.error_code) {
    throw new Error(data.error_msg || data.error_code);
  }

  const translated = data.trans_result?.map((item) => item.dst ?? '').join('').trim();
  if (!translated) {
    throw new Error('empty translation');
  }

  return translated;
}

function createSuccessResult(text: string, settings: Settings, provider: ExternalProvider) {
  return {
    result: `翻译兜底结果（${settings.targetLanguage}）：${text}`,
    notice: provider === 'google' ? '已使用 Google 翻译服务' : '已使用百度翻译服务',
  };
}

function createBuiltInFallback(settings: Settings, text: string, failures: ExternalProvider[]) {
  let notice = '翻译服务暂时不可用，已使用内置翻译兜底';

  if (settings.translationFallbackProvider === 'baidu' && !hasBaiduCredentials(settings)) {
    notice = '百度翻译未配置，已使用内置翻译兜底';
  } else if (failures.length === 2) {
    notice = 'Google / 百度翻译暂时不可用，已使用内置翻译兜底';
  } else if (failures[0] === 'baidu') {
    notice = '百度翻译暂时不可用，已使用内置翻译兜底';
  } else if (failures[0] === 'google') {
    notice = 'Google 翻译暂时不可用，已使用内置翻译兜底';
  }

  return {
    result: processText(text, 'translate', settings, 'fallback'),
    notice,
  };
}

export async function executeTranslationFallback(text: string, settings: Settings) {
  const failures: ExternalProvider[] = [];
  const providers = getProviderOrder(settings);

  for (const provider of providers) {
    try {
      if (provider === 'google') {
        const translated = await executeGoogleTranslation(text, settings);
        return createSuccessResult(translated, settings, provider);
      }

      const translated = await executeBaiduTranslation(text, settings);
      return createSuccessResult(translated, settings, provider);
    } catch {
      failures.push(provider);
    }
  }

  return createBuiltInFallback(settings, text, failures);
}
