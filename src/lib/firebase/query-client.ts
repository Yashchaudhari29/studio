
import { QueryClient } from '@tanstack/react-query';

// Create a new instance of QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // You can set default options for queries here
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: Adjust based on your needs
    },
  },
});
