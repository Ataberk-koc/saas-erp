"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce"; // (Opsiyonel ama önerilen)

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);

    // 👇 DÜZELTME: Arama yapıldığı an sayfayı 1'e çekiyoruz.
    params.set("page", "1");

    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }

    replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative flex flex-1 shrink-0">
      <Input
        className="w-full bg-white pl-10"
        placeholder={placeholder}
        onChange={useDebouncedCallback((e) => {
          handleSearch(e.target.value);
        }, 300)}
        // Eğer debounce kullanmak isterseniz (npm i use-debounce):
        // onChange={useDebouncedCallback((e) => handleSearch(e.target.value), 300)}

        defaultValue={searchParams.get("q")?.toString()}
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        🔍
      </span>
    </div>
  );
}
