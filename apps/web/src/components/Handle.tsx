/** Renders a name.agent handle with the .agent TLD dimmed (the niche tell). */
export default function Handle({
  name,
  className = '',
  size,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const tld = '.agent';
  const base = name.endsWith(tld) ? name.slice(0, -tld.length) : name;
  return (
    <span className={`handle ${className}`} style={size ? { fontSize: size } : undefined}>
      {base}
      <span className="tld">{tld}</span>
    </span>
  );
}
