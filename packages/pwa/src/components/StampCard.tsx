interface Props {
  title: string;
  current: number;
  target: number;
  reward: string;
}

export default function StampCard({ title, current, target, reward }: Props) {
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const completed = current >= target;

  return (
    <div className={`bg-white rounded-2xl p-5 border ${completed ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        {completed && (
          <span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            ¡Premio listo!
          </span>
        )}
      </div>

      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: target }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-7 rounded-md transition-all ${
              i < current
                ? 'bg-primary-500 shadow-sm'
                : 'bg-gray-100 border border-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          <span className="font-semibold text-gray-900">{current}</span> / {target} sellos
        </span>
        <span className="text-primary-600 font-medium">{reward}</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
        <div
          className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
