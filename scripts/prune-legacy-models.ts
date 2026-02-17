import fs from 'fs';
import path from 'path';

const modelsPath = path.join(process.cwd(), 'entrypoints/sidepanel/models.json');
const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

let removedCount = 0;

models.categories.forEach(category => {
    category.models = category.models.filter(model => {
        // 剔除已知容易崩溃或已淘汰的旧型号
        const isOutdated = 
            model.value.includes('Llama-2') || // Llama 2 已普遍被 3 替代且兼容性较差
            model.value.includes('Qwen-1_8B') || // 旧版 Qwen
            model.value.includes('Qwen1.5') || // 1.5 已经有 2.5 替代
            model.value.includes('stablelm') || // 极旧型号
            model.value.includes('RedPajama'); // 极旧型号
        
        if (isOutdated) {
            console.log(`[Pruner] Removing legacy model: ${model.value}`);
            removedCount++;
        }
        return !isOutdated;
    });
});

fs.writeFileSync(modelsPath, JSON.stringify(models, null, 2));
console.log(`[Done] Pruned ${removedCount} legacy model variants.`);
