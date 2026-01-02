export const StatCard = ({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper?: string;
}) => {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="font-heading text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
};
