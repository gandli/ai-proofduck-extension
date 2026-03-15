const bufferStr = "data: {\"choices\":[{\"delta\":{\"content\":\"test\"}}]}\n".repeat(50);

function withSplit(iterations) {
    let buffer = "";
    let fullText = "";
    const start = performance.now();
    for(let i=0; i<iterations; i++) {
        buffer += bufferStr;
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        for (const line of lines) {
            fullText += line.length;
        }
    }
    return performance.now() - start;
}

console.log("Split:", withSplit(1000));
