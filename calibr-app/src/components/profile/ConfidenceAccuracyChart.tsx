"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConfidenceAccuracyChartProps {
  data: { confidence: string; predicted: number; actual: number }[];
}

export function ConfidenceAccuracyChart({ data }: ConfidenceAccuracyChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 h-full">
      <div className="mb-6">
        <h3 className="font-medium">Calibration</h3>
        <p className="text-xs text-muted-foreground">Ideal: Actual win rate matches confidence</p>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="confidence"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--primary)/0.1)' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pred = payload.find((p: any) => p.name === 'Predicted')?.value;
                  const act = payload.find((p: any) => p.name === 'Actual')?.value;
                  const diff = pred !== undefined && act !== undefined ? (Number(act) - Number(pred)) : 0;
                  const sign = diff > 0 ? "+" : "";

                  return (
                    <div className="bg-card/95 backdrop-blur border border-border p-3 rounded-lg shadow-xl text-xs z-50">
                      <div className="font-bold mb-2 text-foreground">{label} Confidence</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-muted-foreground">Predicted:</span>
                        <span className="font-mono">{pred}%</span>

                        <span className="text-muted-foreground mr-2">Actual:</span>
                        <span className="text-primary font-mono font-bold">
                          {act}% <span className="text-[10px] opacity-80 decoration-dotted underline" title="Difference">({sign}{diff.toFixed(1)}%)</span>
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="predicted"
              name="Predicted"
              fill="hsl(var(--muted))"
              opacity={0.3}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actual"
              name="Actual"
              fill="url(#colorActual)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
