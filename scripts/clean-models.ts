import fs from 'fs';
import path from 'path';

const modelsPath = path.join(process.cwd(), 'entrypoints/sidepanel/models.json');
const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

let removedCount = 0;

models.categories.forEach(category => {
    const originalLength = category.models.length;
    category.models = category.models.filter(model => {
        // 剔除 q3 或 q3f 开头的量化版本，这些在 MLC v0_2_80 官方库中通常不存在
        const isInvalid = model.value.includes('-q3') || model.value.includes('-q2') || model.value.includes('-q5') || model.value.includes('-q6') || model.value.includes('-q8');
        if (isInvalid) {
            console.log(`[Cleaner] Removing unavailable model: ${model.value}`);
            removedCount++;
        }
        return !isInvalid;
    });
});

fs.writeFileSync(modelsPath, JSON.stringify(models, null, 2));
console.log(`[Done] Removed ${removedCount} unavailable model variants.`);
