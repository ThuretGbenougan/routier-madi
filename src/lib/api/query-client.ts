import { QueryClient } from "@tanstack/react-query";
let browserClient: QueryClient | undefined;
export function getQueryClient() {
  if (typeof window === "undefined") return new QueryClient();
  return (browserClient ??= new QueryClient());
}
