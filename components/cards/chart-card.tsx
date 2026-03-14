import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  insight?: string;
  loading?: boolean;
}

export function ChartCard({ title, children, insight, loading }: ChartCardProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310]">
        <Skeleton className="h-3.5 w-32 mb-3" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-2.5 w-2/3 mt-3" />
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310]">
      <h3 className="text-xs font-bold text-[#102A43] mb-2 truncate">{title}</h3>
      <div className="bg-[#F8FAFC] rounded-lg p-2">{children}</div>
      {insight && (
        <p className="text-[10px] text-[#6B7B8D] mt-2 leading-tight">
          {insight}
        </p>
      )}
    </div>
  );
}
