export function ShinyText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`shiny-text ${className}`}>{children}</span>;
}
