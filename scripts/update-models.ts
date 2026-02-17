/**
 * 模型列表自动更新脚本
 * 使用 Bun 运行: bun scripts/update-models.ts
 */

const HF_API = "https://huggingface.co/api/models?author=mlc-ai&search=-MLC";
const OUTPUT_PATH = "entrypoints/sidepanel/models.json";

interface HFModel {
  id: string;
  usedStorage?: number;
}

async function updateModels() {
  console.log("正在从 Hugging Face 获取最新模型列表 (包括文件大小)...");
  
  try {
    const listResponse = await fetch(HF_API);
    
    let rawModels: HFModel[] = [];
    let apiWorks = false;

    if (listResponse.status === 429) {
      console.warn("HF API 频率限制 (429)。尝试使用本地文件进行启发式排序...");
      const localFile = Bun.file(OUTPUT_PATH);
      if (await localFile.exists()) {
        const localData = await localFile.json();
        rawModels = localData.categories.flatMap((c: any) => c.models.map((m: any) => ({ id: m.value })));
      } else {
        throw new Error("API 被限频且本地无 models.json 备份。");
      }
    } else if (!listResponse.ok) {
      throw new Error(`HTTP error! status: ${listResponse.status}`);
    } else {
      rawModels = await listResponse.json();
      apiWorks = true;
      console.log(`发现 ${rawModels.length} 个 MLC 模型。开始获取详细信息...`);
    }

    const modelDetails: HFModel[] = [];
    
    if (apiWorks) {
      const BATCH_SIZE = 15;
      for (let i = 0; i < rawModels.length; i += BATCH_SIZE) {
        const batch = rawModels.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (m) => {
          try {
            const detailRes = await fetch(`https://huggingface.co/api/models/${m.id}?fields=usedStorage`);
            if (detailRes.ok) return await detailRes.json();
          } catch (e) {}
          return m;
        });
        
        const results = await Promise.all(batchPromises);
        modelDetails.push(...results);
        process.stdout.write(`\r进度: ${Math.min(i + BATCH_SIZE, rawModels.length)}/${rawModels.length}`);
      }
      console.log("\n信息获取完成。正在分类并格式化...");
    } else {
      // 如果 API 不通，直接使用 rawModels (即本地数据)
      modelDetails.push(...rawModels);
    }

    // 过滤和分类
    const categories: Record<string, any[]> = {
      "DeepSeek": [],
      "Qwen (通义千问)": [],
      "Llama": [],
      "Gemma": [],
      "Phi": [],
      "SmolLM (极致轻量级)": [],
      "Mistral": [],
      "Others": []
    };

    modelDetails.forEach(m => {
      const id = m.id.replace("mlc-ai/", "");
      let size = m.usedStorage || parseHeuristicSize(id);
      
      const sizeStr = size > 0 ? ` (~${formatBytes(size)})` : "";
      const modelData = {
        name: `${formatModelName(id)}${sizeStr}`,
        value: id,
        rawSize: size
      };

      const lowerId = id.toLowerCase();
      if (lowerId.includes("deepseek")) categories["DeepSeek"].push(modelData);
      else if (lowerId.includes("qwen")) categories["Qwen (通义千问)"].push(modelData);
      else if (lowerId.includes("llama") || lowerId.includes("codellama")) categories["Llama"].push(modelData);
      else if (lowerId.includes("gemma")) categories["Gemma"].push(modelData);
      else if (lowerId.includes("phi")) categories["Phi"].push(modelData);
      else if (lowerId.includes("smollm")) categories["SmolLM (极致轻量级)"].push(modelData);
      else if (lowerId.includes("mistral") || lowerId.includes("mixtral")) categories["Mistral"].push(modelData);
      else categories["Others"].push(modelData);
    });

    // 转换为最终 JSON 格式
    const finalData = {
      categories: Object.entries(categories)
        .filter(([_, models]) => models.length > 0)
        .map(([label, models]) => ({
          label,
          models: models.sort((a, b) => a.rawSize - b.rawSize)
        }))
    };

    await Bun.write(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
    console.log(`成功更新模型列表并按大小升序排序！保存至: ${OUTPUT_PATH}`);

  } catch (error) {
    console.error("更新失败:", error);
  }
}

function parseHeuristicSize(id: string): number {
  const pMatch = id.match(/([\d\.]+)B/i);
  const params = pMatch ? parseFloat(pMatch[1]) : 0;
  if (params === 0) return 0;

  let bits = 4;
  if (id.toLowerCase().includes("q8")) bits = 8;
  else if (id.toLowerCase().includes("q0") || id.toLowerCase().includes("fp16") || id.toLowerCase().includes("bf16")) bits = 16;
  else if (id.toLowerCase().includes("q3")) bits = 3;

  return params * (bits / 8) * 1024 * 1024 * 1024;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatModelName(id: string) {
  let display = id.replace(/-MLC$/i, "")
    .replace(/-q\w+(_\d+)?/g, "")
    .replace(/-Instruct/i, "")
    .replace(/-/g, " ");
  
  return display.trim();
}

updateModels();
