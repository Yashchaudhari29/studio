

"use client"; // Required for TanStack Query hooks

import type { NextPage } from 'next';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { getCustomers } from '@/lib/api/customers'; // Use the updated API function
import type { Customer } from '@/lib/api/customers'; // Import the type
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Function to format currency
const formatCurrency = (amount: number) => {
  // Handle potential non-numeric input gracefully
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const CustomersPage: NextPage = () => {

  // Fetch customers using TanStack Query
  const { data: customers, isLoading, isError, error, isFetching } = useQuery<Customer[], Error>({
    queryKey: ['customers'], // Unique key for this query
    queryFn: getCustomers,    // Function to fetch data
    staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

   console.log("CustomersPage State:", { isLoading, isError, isFetching, customers, error });


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Manage your customer information and balances.</CardDescription>
          </div>
          <Link href="/customers/new" passHref>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? ( // Show skeletons on initial load
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-5/6" />
            </div>
          ) : isError ? ( // Show error message if fetching failed
            <div className="flex flex-col justify-center items-center py-10 text-destructive">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <span>Error loading customers:</span>
               <span className="text-sm text-muted-foreground">{error?.message ?? 'Unknown error'}</span>
            </div>
          ) : !customers || customers.length === 0 ? ( // Show message if no customers found
             <div className="text-center text-muted-foreground py-10">
                No customers found. Add your first customer!
             </div>
          ) : ( // Render the table if data is available
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Mobile</TableHead>
                  <TableHead className="hidden sm:table-cell">Village</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Pending Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                   // Ensure customer and customer.id exist before rendering row
                  customer && customer.id ? (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name ?? 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{customer.mobile ?? 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{customer.village ?? 'N/A'}</TableCell>
                         <TableCell className="hidden lg:table-cell text-right">{formatCurrency(customer.totalPaid ?? 0)}</TableCell>
                        <TableCell className={`text-right font-semibold ${customer.pendingAmount > 0 ? 'text-destructive' : 'text-accent'}`}>
                           {formatCurrency(customer.pendingAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                           <Link href={`/customers/${customer.id}`} passHref>
                              <Button variant="ghost" size="icon" aria-label={`View details for ${customer.name}`}>
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View Details</span>
                              </Button>
                           </Link>
                          {/* Add Edit/Delete buttons later with mutation logic */}
                        </TableCell>
                      </TableRow>
                  ) : (
                      // Optional: Render a placeholder or log an error for invalid customer data
                      <TableRow key={`invalid-${Math.random()}`}>
                         <TableCell colSpan={6} className="text-center text-muted-foreground italic">
                             Invalid customer data encountered.
                         </TableCell>
                      </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          )}
           {/* Optional: Show a subtle loading indicator during background refetches */}
          {isFetching && !isLoading && (
             <div className="absolute bottom-2 right-2 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Syncing...</span>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersPage;
