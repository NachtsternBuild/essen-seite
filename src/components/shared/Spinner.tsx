interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const cls = `spinner spinner--${size}${className ? ` ${className}` : ''}`;
  return <span className={cls} role="status" aria-label="Lädt…" />;
}
