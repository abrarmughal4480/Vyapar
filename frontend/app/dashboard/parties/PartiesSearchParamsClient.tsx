"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PartiesSearchParamsClient({ onParams }: { onParams: (params: URLSearchParams) => void }) {
  const params = useSearchParams();
  useEffect(() => {
    onParams(params);
    // eslint-disable-next-line
  }, [params]);
  return null;
} 