
"use client"; // Required for hooks and mutations

import type { NextPage } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import { format, isSameDay } from 'date-fns'; // Import date-fns functions

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { getWaterSupplyEntries, deleteWaterSupplyEntry } from '@/lib/api/entries'; // Use updated API
import type { WaterSupplyEntry } from '@/lib/api/entries'; // Import type
import { useToast } from "@/hooks/use-toast"; // Import useToast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';

// Function to format currency
const formatCurrency = (amount: number | null | undefined): string => {
   if (amount == null || isNaN(amount)) return 'N/A';
   return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

// Function to format Firestore Timestamp or Date object
const formatDate = (dateInput: Timestamp | Date | undefined): string => {
    if (!dateInput) return 'N/A';
    const date = dateInput instanceof Timestamp ? dateInput.toDate() : dateInput;
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'dd MMM yyyy'); // e.g., 15 Jul 2024
};

// Function to format the date range, handling same-day and cross-day entries
const formatDateRange = (startTimestamp: Timestamp | undefined, endTimestamp: Timestamp | undefined): string => {
    if (!startTimestamp || !endTimestamp) return 'N/A';
    const startDate = startTimestamp.toDate();
    const endDate = endTimestamp.toDate();
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid Date Range';

    if (isSameDay(startDate, endDate)) {
        return format(startDate, 'dd MMM yyyy');
    } else {
        return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
    }
};


const EntriesPage: NextPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [entryToDelete, setEntryToDelete] = useState<WaterSupplyEntry | null>(null); // State to hold entry for deletion confirmation

  // Fetch entries using TanStack Query
  const { data: entries, isLoading, isError, error, refetch, isFetching } = useQuery<WaterSupplyEntry[], Error>({ // Specify Error type
    queryKey: ['entries'], // Unique key for this query
    queryFn: getWaterSupplyEntries,
    staleTime: 1000 * 60 * 1, // Data is fresh for 1 minute
    refetchOnWindowFocus: true,
  });

   // Mutation for deleting an entry
   const deleteEntryMutation = useMutation({
     mutationFn: deleteWaterSupplyEntry, // Pass the function directly
     onSuccess: (_, deletedEntry) => { // Second argument is the variable passed to mutate
       toast({
         title: "Entry Deleted",
         description: `Entry for ${deletedEntry.customerName} on ${formatDate(deletedEntry.entryTimestamp)} deleted.`,
         variant: "default",
       });
       // Invalidate relevant queries to trigger refetch
       queryClient.invalidateQueries({ queryKey: ['entries'] });
       // Invalidate potentially affected customer data (details, history, pending amount)
       queryClient.invalidateQueries({ queryKey: ['customer', deletedEntry.customerId] });
       queryClient.invalidateQueries({ queryKey: ['customerHistory', deletedEntry.customerId] });
       queryClient.invalidateQueries({ queryKey: ['customers'] }); // Customer list for pending amounts
       queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Dashboard data uses pending amounts

     },
     onError: (error: Error, deletedEntry) => { // Specify Error type
       toast({
         title: "Error Deleting Entry",
         description: `Failed to delete entry: ${error.message || 'Please try again.'}`,
         variant: "destructive",
       });
     },
      onSettled: () => {
        setEntryToDelete(null); // Always close the dialog after mutation finishes
      }
   });


  const handleDeleteClick = (entry: WaterSupplyEntry) => {
    setEntryToDelete(entry); // Set the entry to be deleted and open dialog implicitly
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
       console.log("Confirming deletion for entry:", entryToDelete.id);
      // Pass the specific entry object to the mutation
      deleteEntryMutation.mutate(entryToDelete);
    } else {
        console.error("Attempted to confirm delete but no entry was selected.");
        toast({ title: "Error", description: "No entry selected for deletion.", variant: "destructive" });
    }
  };

   const handleRefresh = () => {
        refetch();
        toast({ title: "Refreshing Entries...", variant: "default", duration: 2000 });
    };

  // Determine if the delete button for a specific row should be disabled
  const isDeletingEntry = (entryId: string): boolean => {
      return deleteEntryMutation.isPending && entryToDelete?.id === entryId;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle>Water Supply Entries</CardTitle>
            <CardDescription>View and manage all recorded water supply entries.</CardDescription>
          </div>
           <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching || isLoading} aria-label="Refresh entries">
                  {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Link href="/entries/new" passHref>
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
                </Button>
              </Link>
           </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
               {[...Array(5)].map((_, i) => (
                 <Skeleton key={i} className="h-12 w-full" />
               ))}
             </div>
          ) : isError ? (
             <div className="flex flex-col justify-center items-center py-10 text-destructive space-y-2">
                <AlertTriangle className="h-6 w-6" />
                <span>Error loading entries:</span>
                <span className="text-sm text-muted-foreground">{error?.message ?? 'Unknown error'}</span>
                 <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                </Button>
            </div>
          ) : !entries || entries.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                 No entries found. Add your first water supply entry!
              </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                  <TableHead className="hidden md:table-cell">Duration</TableHead>
                  <TableHead className="hidden lg:table-cell">Crop</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                    <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.customerName}</TableCell>
                        {/* Use formatDateRange for potentially multi-day entries */}
                        <TableCell>{formatDateRange(entry.entryTimestamp, entry.endDate)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{entry.startTime} - {entry.endTime}</TableCell>
                        <TableCell className="hidden md:table-cell">{entry.durationHours?.toFixed(1) ?? 'N/A'} hr</TableCell>
                        <TableCell className="hidden lg:table-cell">{entry.cropType}</TableCell>
                        <TableCell>{formatCurrency(entry.amount)}</TableCell>
                        <TableCell>
                            <Badge variant={entry.isPaid ? 'default' : 'destructive'} className={cn(entry.isPaid ? 'bg-accent text-accent-foreground' : '')}>
                                {entry.isPaid ? 'Paid' : 'Pending'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {/* Edit Button - Link to edit page (implement later) */}
                            <Button variant="ghost" size="icon" className="mr-1" disabled aria-label="Edit entry">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                            </Button>
                            {/* Delete Button with Confirmation */}
                            <AlertDialog
                                open={entryToDelete?.id === entry.id}
                                onOpenChange={(isOpen) => {
                                    if (!isOpen) {
                                        // Only clear if the dialog is closing *and* mutation is not pending for this entry
                                        if (!isDeletingEntry(entry.id)) {
                                            setEntryToDelete(null);
                                        }
                                    }
                                    // Opening is handled by the trigger
                                }}
                            >
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteClick(entry)}
                                        // Disable if a delete mutation is pending for *this specific entry*
                                        disabled={isDeletingEntry(entry.id)}
                                        aria-label={`Delete entry for ${entry.customerName} on ${formatDate(entry.entryTimestamp)}`}
                                    >
                                        {isDeletingEntry(entry.id) ? (
                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                {/* Render content only when this specific entry is targeted */}
                                {entryToDelete?.id === entry.id && (
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will permanently delete the entry for <span className="font-semibold">{entry.customerName}</span> starting on <span className="font-semibold">{formatDate(entry.entryTimestamp)} at {entry.startTime}</span>.
                                            {!entry.isPaid && (
                                            <span className="block mt-2"> The customer's pending amount will be reduced by {formatCurrency(entry.amount)}.</span>
                                            )} This cannot be undone.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setEntryToDelete(null)} disabled={deleteEntryMutation.isPending}>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleConfirmDelete}
                                            disabled={deleteEntryMutation.isPending}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {deleteEntryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {deleteEntryMutation.isPending ? 'Deleting...' : 'Yes, delete entry'}
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                )}
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EntriesPage;

    