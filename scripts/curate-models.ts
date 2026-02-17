import fs from 'fs';
import path from 'path';

const MODELS_JSON_PATH = path.resolve(__dirname, '../entrypoints/sidepanel/models.json');

interface Model {
  name: string;
  value: string;
  rawSize: number;
}

interface Category {
  label: string;
  models: Model[];
}

interface ModelsData {
  categories: Category[];
}

// 精选白名单：仅保留这些型号的 q4f16_1 版本（性能与效果的最佳平衡）
const WHITELIST_BASES = [
  'DeepSeek-R1-Distill-Qwen-1.5B',
  'DeepSeek-R1-Distill-Qwen-7B',
  'DeepSeek-R1-Distill-Qwen-14B',
  'DeepSeek-R1-Distill-Llama-8B',
  'Qwen2.5-0.5B-Instruct',
  'Qwen2.5-1.5B-Instruct',
  'Qwen2.5-3B-Instruct',
  'Qwen2.5-7B-Instruct',
  'Qwen2.5-14B-Instruct',
  'Llama-3.2-1B-Instruct',
  'Llama-3.2-3B-Instruct',
  'Llama-3-8B-Instruct',
  'Phi-3.5-mini-instruct',
  'gemma-2-2b-it'
];

function curate() {
  if (!fs.existsSync(MODELS_JSON_PATH)) {
    console.error('models.json not found at', MODELS_JSON_PATH);
    return;
  }

  const data: ModelsData = JSON.parse(fs.readFileSync(MODELS_JSON_PATH, 'utf-8'));
  const newCategories: Category[] = [];

  for (const cat of data.categories) {
    const filteredModels = cat.models.filter(m => {
      // 1. 必须属于白名单
      const isWhitelisted = WHITELIST_BASES.some(base => m.value.startsWith(base));
      // 2. 必须是 q4f16_1 量化版本 (或者对于没有 q4f16_1 的极小模型，保留 q4f16_0)
      const isPreferredQuant = m.value.includes('-q4f16_1-MLC') || 
                               (m.value.includes('-q4f16_0-MLC') && !cat.models.some(sm => sm.value.startsWith(m.value.split('-q')[0]) && sm.value.includes('q4f16_1')));
      
      return isWhitelisted && isPreferredQuant;
    });

    if (filteredModels.length > 0) {
      // 排序：按模型大小升序，通常意味着从快到强
      filteredModels.sort((a, b) => (a.rawSize || 0) - (b.rawSize || 0));
      
      newCategories.push({
        label: cat.label,
        models: filteredModels
      });
    }
  }

  // 特殊处理：将最重要的分类（如 DeepSeek 和 Qwen）排在前面
  newCategories.sort((a, b) => {
    const order = ['DeepSeek', 'Qwen', '通义千问', 'Llama'];
    const idxA = order.findIndex(o => a.label.includes(o));
    const idxB = order.findIndex(o => b.label.includes(o));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify({ categories: newCategories }, null, 2));
  console.log(`Curated models.json: Kept ${newCategories.reduce((acc, c) => acc + c.models.length, 0)} models across ${newCategories.length} categories.`);
}

curate();
