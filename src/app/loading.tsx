export default function Loading() {
  return (
    <div className="route-loading" aria-label="Loading page">
      <div className="route-loading-header">
        <div className="skeleton route-loading-title" />
        <div className="skeleton route-loading-action" />
      </div>
      <div className="route-loading-grid">
        <div className="skeleton route-loading-card" />
        <div className="skeleton route-loading-card" />
        <div className="skeleton route-loading-card" />
        <div className="skeleton route-loading-card" />
      </div>
      <div className="route-loading-panel">
        <div className="skeleton route-loading-line wide" />
        <div className="skeleton route-loading-line" />
        <div className="skeleton route-loading-line" />
        <div className="skeleton route-loading-line short" />
      </div>
    </div>
  );
}
