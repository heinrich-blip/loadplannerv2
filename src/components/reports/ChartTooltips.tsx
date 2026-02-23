export function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color } as React.CSSProperties}
          >
            {entry.name}:{" "}
            <span className="font-medium">
              {entry.value.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fill: string } }[];
}) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-xl">
        <p
          className="font-semibold text-foreground"
          style={{ color: data.payload.fill } as React.CSSProperties}
        >
          {data.name}
        </p>
        <p className="text-sm text-muted-foreground">
          Count:{" "}
          <span className="font-medium text-foreground">
            {data.value.toLocaleString()}
          </span>
        </p>
      </div>
    );
  }
  return null;
}