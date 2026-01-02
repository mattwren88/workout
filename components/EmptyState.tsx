export const EmptyState = ({
  title,
  detail
}: {
  title: string;
  detail: string;
}) => {
  return (
    <div className="card-ghost flex flex-col items-start gap-2 p-6 text-slate-600">
      <p className="font-heading text-lg font-semibold text-slate-900">{title}</p>
      <p className="text-sm">{detail}</p>
    </div>
  );
};
