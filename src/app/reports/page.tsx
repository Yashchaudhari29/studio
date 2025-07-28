
"use client";

import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Download, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getCustomers } from '@/lib/api/customers'; // API function
import { getFilteredEntries, exportEntries } from '@/lib/api/reports'; // API functions
import type { Customer } from '@/lib/api/customers'; // Type
import type { ReportEntry, ReportFilters } from '@/lib/api/reports'; // Types
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Badge } from "@/components/ui/badge"; // Import Badge component

// --- Form Schema ---
const reportFilterSchema = z.object({
  customerId: z.string().optional().default('all'), // Default to 'all'
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(data => {
    if (data.startDate && data.endDate) {
        // Ensure end date is on or after start date (consider full days)
         const start = new Date(data.startDate);
         start.setHours(0,0,0,0);
         const end = new Date(data.endDate);
         end.setHours(0,0,0,0);
        return end >= start;
    }
    return true;
}, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});

type ReportFilterValues = z.infer<typeof reportFilterSchema>;

// --- Helper Functions ---
const formatCurrency = (amount: number | null | undefined) => {
   if (amount == null || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};
const formatDate = (dateInput: Timestamp | Date | undefined | null) => {
    if (!dateInput) return 'N/A';
    let date: Date;
     if (dateInput instanceof Timestamp) {
         date = dateInput.toDate();
     } else if (dateInput instanceof Date) {
         date = dateInput;
     } else {
         return 'Invalid Date';
     }

     if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'dd MMM yyyy'); // e.g., 15 Jul 2024
};

// --- Component ---
const ReportsPage: NextPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State to hold the filters currently being used for the report query
  const [activeFilters, setActiveFilters] = useState<ReportFilterValues>({ customerId: 'all' });
  const [showReport, setShowReport] = useState(false); // Control visibility of report table

  // Form hook
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: {
      customerId: 'all',
      startDate: undefined,
      endDate: undefined,
    },
    mode: 'onChange', // Validate on change
  });

  // --- TanStack Query Hooks ---
   const { data: customers, isLoading: isLoadingCustomers, isError: isErrorCustomers } = useQuery<Customer[], Error>({
        queryKey: ['customers'], // Reuse customer query
        queryFn: getCustomers,
        // Add 'All Customers' option manually after fetching
        select: (data) => [{ id: 'all', name: "All Customers", village: '' } as Customer, ...(data ?? [])], // Handle undefined data and add village
        staleTime: Infinity, // Customers list less likely to change frequently during session
    });


  // Query for filtered entries (enabled based on showReport state)
  const { data: reportData, isLoading: isLoadingReport, isFetching: isFetchingReport, isError: isErrorReport, error: errorReport, refetch: refetchReport } = useQuery<ReportEntry[], Error>({
        queryKey: ['reportEntries', activeFilters], // Key depends on ACTIVE filters
        queryFn: () => getFilteredEntries(activeFilters),
        enabled: showReport, // Only fetch when showReport is true and filters are set
        // Keep data while fetching new filter results for smoother UI
        // keepPreviousData: true, // Consider enabling this if loading states are jarring
    });

  // Mutation for exporting entries
    const exportMutation = useMutation({
        mutationFn: exportEntries, // Use the activeFilters when calling mutate
        onSuccess: (blob, variables) => {
            // Create a downloadable link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Find customer name (handle 'all' case)
            const customerNameForFile = variables.customerId === 'all'
                ? 'all_customers'
                : customers?.find(c => c.id === variables.customerId)?.name?.replace(/\s+/g, '_') ?? 'customer'; // Replace spaces
            const dateSuffix = format(new Date(), 'yyyyMMdd');
            a.download = `water_hishab_report_${customerNameForFile}_${dateSuffix}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: "Export Successful", description: "Report downloaded.", variant: "default" });
        },
        onError: (error: Error) => {
            console.error("Failed to export report:", error);
            toast({ title: "Export Error", description: `Could not export report: ${error.message || 'Please try again.'}`, variant: "destructive" });
        }
    });


  // --- Handlers ---
  const onSubmit = (filters: ReportFilterValues) => {
     console.log("Applying filters:", filters);
     // Clean up filters: remove undefined dates
     const cleanedFilters = {
        customerId: filters.customerId || 'all',
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
     };
    setActiveFilters(cleanedFilters); // Update the filters state that the query depends on
    setShowReport(true); // Show the report section (will trigger query if enabled)

    // No need to manually refetch if query key changes (which it does with activeFilters)
    // Ensure query is enabled to run
  };

   const handleExport = () => {
        if (!showReport || isLoadingReport || isFetchingReport) {
            toast({ title: "Report Not Ready", description: "Please generate and wait for the report to load before exporting.", variant: "destructive" });
            return;
        }
        if (!reportData || reportData.length === 0) {
            toast({ title: "No Data to Export", description: "The current report is empty.", variant: "destructive" });
            return;
        }
        // Pass the filters that generated the *current* report
        exportMutation.mutate(activeFilters);
    };


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Filters Card */}
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>Filter water supply entries by customer and date range.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Customer Filter */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                     <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value} // Use defaultValue here
                        value={field.value} // Controlled component
                        disabled={isLoadingCustomers || exportMutation.isPending || isFetchingReport}
                     >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCustomers ? "Loading..." : "Select customer"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isErrorCustomers ? (
                            <SelectItem value="error" disabled>Error loading customers</SelectItem>
                        ) : isLoadingCustomers ? (
                             <div className="p-4 text-center text-muted-foreground">Loading...</div>
                         ) : (
                             customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} {customer.id !== 'all' ? `(${customer.village})` : ''}
                              </SelectItem>
                            ))
                         )
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date Filter */}
              <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                 disabled={exportMutation.isPending || isFetchingReport}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a start date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                               disabled={(date) => date > new Date() || exportMutation.isPending || isFetchingReport}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                />

                {/* End Date Filter */}
                 <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                 disabled={exportMutation.isPending || isFetchingReport}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick an end date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                               disabled={(date) =>
                                    date > new Date() ||
                                    (form.getValues("startDate") ? date < form.getValues("startDate")! : false) ||
                                    exportMutation.isPending || isFetchingReport
                                }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                         <FormMessage />
                      </FormItem>
                    )}
                />


              <Button type="submit" disabled={isFetchingReport || exportMutation.isPending}>
                 {(isFetchingReport) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                 {isFetchingReport ? 'Generating...' : 'Generate Report'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Report Table Card - Only show after first generation attempt */}
       {showReport && (
          <Card className="shadow-md rounded-lg mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Report Results</CardTitle>
                <CardDescription>
                     {isLoadingReport ? 'Loading report...' :
                      isFetchingReport ? 'Updating report...' :
                      isErrorReport ? 'Error loading report.' :
                      `Showing ${reportData?.length ?? 0} entries matching the filters.`
                     }
                </CardDescription>
            </div>
            <Button onClick={handleExport} disabled={exportMutation.isPending || isLoadingReport || isFetchingReport || !reportData || reportData.length === 0}>
                {exportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {exportMutation.isPending ? 'Exporting...' : 'Export to CSV'}
            </Button>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Time</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                     <TableHead className="text-right">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoadingReport ? ( // Show skeletons while loading
                    [...Array(5)].map((_, i) => ( // Render 5 skeleton rows
                         <TableRow key={`skel-${i}`}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                         </TableRow>
                    ))
                ) : isErrorReport ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-destructive">
                           <div className="flex flex-col items-center justify-center space-y-2">
                              <AlertTriangle className="h-6 w-6" />
                              <span>Error loading report:</span>
                               <span className="text-sm text-muted-foreground">{errorReport?.message ?? 'Unknown error'}</span>
                           </div>
                        </TableCell>
                    </TableRow>
                 ) : reportData?.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No entries found matching the selected filters.
                    </TableCell>
                    </TableRow>
                ) : (
                    reportData?.map((entry) => (
                     // Ensure entry and entry.id exist
                     entry && entry.id ? (
                         <TableRow key={entry.id}>
                            <TableCell>{formatDate(entry.entryTimestamp)}</TableCell>
                            <TableCell className="font-medium">{entry.customerName || 'N/A'}</TableCell>
                            <TableCell className="hidden sm:table-cell">{entry.startTime || 'N/A'} - {entry.endTime || 'N/A'}</TableCell>
                            <TableCell>{entry.durationHours?.toFixed(1) ?? 'N/A'} hr</TableCell>
                            <TableCell>{entry.cropType || 'N/A'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                            <TableCell className="text-right">
                               <Badge variant={entry.isPaid ? 'default' : 'destructive'} className={entry.isPaid ? 'bg-accent text-accent-foreground' : ''}>
                                  {entry.isPaid ? 'Paid' : 'Pending'}
                               </Badge>
                            </TableCell>
                         </TableRow>
                     ) : null // Skip rendering if entry or entry.id is missing
                    ))
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;
