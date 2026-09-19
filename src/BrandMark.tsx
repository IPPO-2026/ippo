// Original artwork supplied by the project owner, displayed without redrawing.
export default function BrandMark({ className = '', decorative = true, label = '' }: { className?: string; decorative?: boolean; label?: string }) {
  return <img className={className} src="/brand/ippo-symbol.png" width="1200" height="1200" alt={decorative ? '' : label} aria-hidden={decorative || undefined} decoding="async" />;
}
