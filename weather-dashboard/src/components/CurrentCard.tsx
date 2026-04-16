"use client";

type Props = {
  label: string;
  value: string;
  unit: string;
  icon: string;
};

export default function CurrentCard({ label, value, unit, icon }: Props) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
        <span className="text-lg">{icon}</span>
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
    </div>
  );
}
