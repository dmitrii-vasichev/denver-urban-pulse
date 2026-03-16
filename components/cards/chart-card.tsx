import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  insight?: string;
  loading?: boolean;
  className?: string;
}

export function ChartCard({ title, children, insight, loading, className }: ChartCardProps) {
  if (loading) {
    return (
      <div className={`rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310] ${className ?? ""}`}>
        <Skeleton className="h-3.5 w-32 mb-3" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-2.5 w-2/3 mt-3" />
      </div>
    );
  }

  return (
    <div className={`rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310] flex flex-col ${className ?? ""}`}>
      <h3 className="text-xs font-bold text-[#102A43] mb-2 truncate">{title}</h3>
      <div className="bg-[#F8FAFC] rounded-lg p-2 flex-1 flex flex-col min-h-0 overflow-hidden">{children}</div>
      {insight && (
        <p className="text-[10px] text-[#6B7B8D] mt-2 leading-tight">
          {insight}
        </p>
      )}
    </div>
  );
}
