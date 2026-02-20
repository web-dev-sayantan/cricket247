import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { orpc } from "@/utils/orpc";

export const useTeamSearch = (searchInput: string, debounceTime = 300) => {
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, debounceTime);
    return () => clearTimeout(timer);
  }, [searchInput, debounceTime]);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    ...orpc.searchTeamsByName.queryOptions({ input: debouncedSearch }),
    enabled: debouncedSearch.length > 0,
  });

  return { data, isLoading, error };
};
