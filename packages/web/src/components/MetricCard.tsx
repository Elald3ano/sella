interface Props {
  label: string;
  value: number;
  icon: string;
}

export default function MetricCard({ label, value, icon }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-extrabold text-gray-900">{value.toLocaleString('es-CO')}</div>
    </div>
  );
}
