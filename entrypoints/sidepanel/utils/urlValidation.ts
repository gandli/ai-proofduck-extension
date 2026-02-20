export function isValidModelUrl(url: string): boolean {
  if (!url) return false;

  // We only allow URLs from trusted model repositories to prevent cache poisoning
  // with malicious content.
  // Whitelisted domains:
  // 1. HuggingFace (standard model hub)
  // 2. GitHub (mlc-ai org for binary libs)

  return (
    url.startsWith('https://huggingface.co/') ||
    url.startsWith('https://raw.githubusercontent.com/mlc-ai/')
  );
}
