import { Skeleton } from "@/components/ui/skeleton";

interface NarrativeBlockProps {
  title: string;
  content: string;
  stats?: { label: string; value: string }[];
  loading?: boolean;
}

export function NarrativeBlock({
  title,
  content,
  stats = [],
  loading,
}: NarrativeBlockProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] bg-[#163A5D] p-4 shadow-[0_4px_12px_#102A4320]">
        <Skeleton className="h-4 w-40 mb-3 bg-white/10" />
        <Skeleton className="h-3 w-full mb-1 bg-white/10" />
        <Skeleton className="h-3 w-4/5 mb-1 bg-white/10" />
        <Skeleton className="h-3 w-3/5 mb-4 bg-white/10" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
          <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-[#163A5D] p-4 shadow-[0_4px_12px_#102A4320]">
      <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
      <p className="text-[11px] text-[#D7E5F5] leading-[1.45] mb-3">
        {content}
      </p>
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <span
              key={stat.label}
              className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/90"
            >
              <span className="font-semibold">{stat.value}</span>
              <span className="text-white/60">{stat.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
