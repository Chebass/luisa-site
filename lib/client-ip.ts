/** Trust Cloudflare's client header only on deployments explicitly using Workers. */
export function requestClientIp(
  headers: Pick<Headers, "get">,
  platform?: string,
) {
  if (platform === "cloudflare") {
    return headers.get("cf-connecting-ip")?.trim() || "unknown";
  }
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
