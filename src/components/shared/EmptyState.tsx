interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon">{icon}</span>
      {title && <h3 className="empty-state__title">{title}</h3>}
      <p className="empty-state__message">{message}</p>
      {action && (
        <button className="btn btn--primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
