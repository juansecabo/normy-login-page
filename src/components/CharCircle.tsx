interface CharCircleProps {
  value: number;
  max: number;
  size?: number;
}

const CharCircle = ({ value, max, size = 28 }: CharCircleProps) => {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, (value / max) * 100);
  const dash = c * (pct / 100);
  const over = value > max;
  const near = !over && value > max * 0.85;
  const color = over ? "#dc2626" : near ? "#d97706" : "#16a34a";
  const textColor = over ? "text-red-600" : near ? "text-orange-600" : "text-muted-foreground";
  const remaining = max - value;
  return (
    <div className="inline-flex items-center gap-2">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 150ms ease, stroke 150ms ease" }}
        />
      </svg>
      <span className={`text-xs font-medium tabular-nums ${textColor}`}>
        {over ? `${remaining}` : `${value} / ${max}`}
      </span>
    </div>
  );
};

export default CharCircle;
