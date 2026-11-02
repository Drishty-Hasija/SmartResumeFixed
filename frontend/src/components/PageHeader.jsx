export default function PageHeader({ eyebrow, title, description, actions, stackActions = false, className = '' }) {
  return (
    <header className={`mb-8 flex flex-col gap-4 ${stackActions ? '' : 'md:flex-row md:items-end md:justify-between'} ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="t-h1 [overflow-wrap:anywhere]">{title}</h1>
        {description && <p className="t-lead mt-3 max-w-prose text-[1rem]">{description}</p>}
      </div>
      {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
