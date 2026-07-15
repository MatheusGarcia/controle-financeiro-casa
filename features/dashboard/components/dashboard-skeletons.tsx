export function MonthlySummarySkeleton() {
  return (
    <section className="grid summary-grid" aria-busy="true" aria-label="Carregando resumo do mês" id="summary">
      {Array.from({ length: 4 }, (_, index) => (
        <article className="card loading-card" key={index}>
          <span className="skeleton skeleton-label" />
          <span className="skeleton skeleton-value" />
        </article>
      ))}
    </section>
  );
}

export function MonthlyDashboardSkeleton() {
  return (
    <section className="dashboard dashboard-loading" aria-busy="true" aria-label="Carregando dashboard" id="dashboard">
      <div className="dashboard-heading"><div><span className="skeleton skeleton-label" /><span className="skeleton skeleton-title" /></div></div>
      <div className="grid dashboard-grid">
        {Array.from({ length: 3 }, (_, index) => <article className="card dashboard-card loading-card" key={index}><span className="skeleton skeleton-title" /><span className="skeleton skeleton-block" /></article>)}
      </div>
      <div className="grid insights-grid">
        {Array.from({ length: 2 }, (_, index) => <article className="card loading-card" key={index}><span className="skeleton skeleton-title" /><span className="skeleton skeleton-chart" /></article>)}
      </div>
    </section>
  );
}
