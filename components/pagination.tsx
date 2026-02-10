"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-8 py-4 border-t">
      {/* ÖNCEKİ SAYFA */}
      <Button
        variant={currentPage <= 1 ? "ghost" : "default"}
        size="sm"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
        className={currentPage > 1 ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
      >
        {currentPage > 1 ? (
          <Link href={createPageURL(currentPage - 1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Önceki
          </Link>
        ) : (
          <span>
            <ArrowLeft className="w-4 h-4 mr-2" /> Önceki
          </span>
        )}
      </Button>

      <span className="text-sm font-semibold text-slate-700 px-4 py-2 bg-slate-100 rounded-md">
        {currentPage} / {totalPages === 0 ? 1 : totalPages}
      </span>

      {/* SONRAKİ SAYFA */}
      <Button
        variant={currentPage >= totalPages ? "ghost" : "default"}
        size="sm"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
        className={currentPage < totalPages ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
      >
        {currentPage < totalPages ? (
          <Link href={createPageURL(currentPage + 1)}>
            Sonraki <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        ) : (
          <span>
            Sonraki <ArrowRight className="w-4 h-4 ml-2" />
          </span>
        )}
      </Button>
    </div>
  );
}