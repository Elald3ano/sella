interface Props {
  name: string;
  businessId: string;
}

export default function BusinessInfo({ name, businessId }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-xl">
        🏪
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{name}</h3>
        <p className="text-xs text-gray-400">Código: {businessId.slice(0, 8)}</p>
      </div>
    </div>
  );
}
