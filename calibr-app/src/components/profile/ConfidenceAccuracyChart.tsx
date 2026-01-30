"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConfidenceAccuracyChartProps {
  data: { confidence: string; predicted: number; actual: number }[];
}

export function ConfidenceAccuracyChart({ data }: ConfidenceAccuracyChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-medium mb-4">Confidence vs Accuracy</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis 
              dataKey="confidence" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Bar 
              dataKey="predicted" 
              name="Predicted" 
              fill="hsl(var(--muted))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="actual" 
              name="Actual" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => {
                const diff = Math.abs(entry.predicted - entry.actual);
                const color = diff <= 5 
                  ? 'hsl(var(--success))' 
                  : diff <= 10 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--destructive))';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Green = well-calibrated, Purple = slight deviation, Red = overconfident
      </p>
    </div>
  );
}
