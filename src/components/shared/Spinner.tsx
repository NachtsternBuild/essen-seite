interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const cls = `spinner spinner--${size}${className ? ` ${className}` : ''}`;
  return <span className={cls} role="status" aria-label="Lädt…" />;
}

export function PageSpinner({ label = 'Lädt…' }: { label?: string }) {
  return (
    <div className="page-spinner">
      <Spinner size="lg" />
      <p className="page-spinner__label">{label}</p>
    </div>
  );
}
