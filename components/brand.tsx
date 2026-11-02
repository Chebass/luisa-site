import Link from "next/link";
export const BUSINESS_NAME = "Health and Beauty";
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.webp"
      width={720}
      height={562}
      alt={`${BUSINESS_NAME}, salón de masajes y terapia física`}
      className={`brand-logo ${className}`.trim()}
    />
  );
}
export function Brand({ href = "/inicio" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label={`${BUSINESS_NAME}, inicio`}>
      <BrandLogo />
    </Link>
  );
}
