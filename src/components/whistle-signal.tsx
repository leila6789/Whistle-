export function WhistleSignal() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#1c140c]/35" aria-hidden>
      <div className="paper border border-[#1c140c] px-6 py-5">
        <svg viewBox="0 0 120 150" className="h-28 w-24">
          <circle cx="58" cy="28" r="14" fill="#1c140c" />
          <rect x="40" y="46" width="36" height="52" fill="#1c140c" />
          <rect x="40" y="62" width="36" height="7" fill="#f4efe4" />
          <rect x="40" y="78" width="36" height="7" fill="#f4efe4" />
          <g className="ref-arm">
            <rect x="70" y="18" width="9" height="40" fill="#1c140c" />
            <circle cx="74.5" cy="16" r="6" fill="#e25b1a" />
          </g>
          <g className="whistle-puff" stroke="#e25b1a" strokeWidth="3" strokeLinecap="square">
            <path d="M86 34 h14" />
            <path d="M88 42 h18" />
          </g>
        </svg>
      </div>
    </div>
  );
}
