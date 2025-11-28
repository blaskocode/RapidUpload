interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export default function Badge({ variant = 'default', size = 'sm', children, className, dot }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
    success: 'bg-[var(--color-success-light)] text-green-800',
    warning: 'bg-[var(--color-warning-light)] text-amber-800',
    error: 'bg-[var(--color-error-light)] text-red-800',
    info: 'bg-[var(--color-info-light)] text-blue-800',
    accent: 'bg-[var(--color-accent-light)] text-amber-800',
  };

  const dotColors = {
    default: 'bg-[var(--color-text-muted)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    error: 'bg-[var(--color-error)]',
    info: 'bg-[var(--color-info)]',
    accent: 'bg-[var(--color-accent)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className || ''}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
