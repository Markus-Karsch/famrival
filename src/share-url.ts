export function spielseasonShareUrl(origin: string, hash: string) {
  return `${origin}/spielseason/${encodeURIComponent(hash)}`
}
