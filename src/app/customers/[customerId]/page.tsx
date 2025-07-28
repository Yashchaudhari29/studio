
"use client"; // Required for hooks

import type { NextPage } from 'next';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react'; // Removed unused 'useEffect' from React import
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, CreditCard, Loader2, AlertTriangle, RefreshCcw, Trash2 } from 'lucide-react'; // Combined imports
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { getCustomerDetails, getCustomerSupplyHistory, recordPayment, deleteCustomer } from '@/lib/api/customers'; // Use updated API
import RecordPaymentDialog from '@/components/record-payment-dialog';
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { format, isSameDay } from 'date-fns'; // Import date-fns functions
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
} from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation'; // For redirecting after delete

// Import types
import type { Customer, WaterSupplyEntry } from '@/lib/api/customers';


// Function to format currency
const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null || isNaN(amount)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

// Function to format Firestore Timestamp or Date object
const formatDate = (dateInput: Timestamp | Date | undefined): string => {
    if (!dateInput) return 'N/A';
    const date = dateInput instanceof Timestamp ? dateInput.toDate() : dateInput;
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'dd MMM yyyy'); // Format example: 15 Jul 2024
};

// Function to format the date range, handling same-day and cross-day entries
const formatDateRange = (startTimestamp: Timestamp | undefined, endTimestamp: Timestamp | undefined): string => {
    if (!startTimestamp || !endTimestamp) return 'N/A';
    const startDate = startTimestamp.toDate();
    const endDate = endTimestamp.toDate();
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid Date Range';

    // Display only start date if it's the same day
    if (isSameDay(startDate, endDate)) {
        return format(startDate, 'dd MMM yyyy');
    } else {
        // Show date range if start and end dates are different
        return `${format(startDate, 'dd MMM yy')} - ${format(endDate, 'dd MMM yy')}`; // Shorter format for range
    }
};


const CustomerDetailsPage: NextPage = () => {
  const params = useParams();
  const customerId = params?.customerId as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);


  // Fetch Customer Details
  const { data: customer, isLoading: isLoadingCustomer, isError: isErrorCustomer, error: errorCustomer, refetch: refetchCustomer } = useQuery<Customer | null>({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerDetails(customerId),
    enabled: !!customerId && hasMounted, // Only run query if customerId is available and component has mounted
  });

  // Fetch Customer History
  const { data: history, isLoading: isLoadingHistory, isError: isErrorHistory, error: errorHistory, refetch: refetchHistory } = useQuery<WaterSupplyEntry[]>({
    queryKey: ['customerHistory', customerId],
    queryFn: () => getCustomerSupplyHistory(customerId),
    enabled: !!customerId && hasMounted, // Only run query if customerId is available and component has mounted
  });

  // Mutation for recording payment
  const recordPaymentMutation = useMutation({
    mutationFn: ({ amount }: { amount: number }) => recordPayment(customerId, amount),
    onSuccess: (_, variables) => {
        toast({
            title: "Payment Recorded",
            description: `${formatCurrency(variables.amount)} payment recorded successfully.`,
            variant: "default",
        });
        // Invalidate related queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
        queryClient.invalidateQueries({ queryKey: ['customerHistory', customerId] });
        queryClient.invalidateQueries({ queryKey: ['entries'] }); // Invalidate general entries list too
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Invalidate dashboard
        queryClient.invalidateQueries({ queryKey: ['customers'] }); // Invalidate customer list for pending amounts
        setIsPaymentDialogOpen(false); // Close dialog on success
    },
    onError: (error) => {
        toast({
            title: "Error Recording Payment",
            description: `${error instanceof Error ? error.message : 'Please try again.'}`,
            variant: "destructive",
        });
         // Optionally close dialog on error, or keep it open for retry
         // setIsPaymentDialogOpen(false);
    }
  });

   // Mutation for deleting customer
    const deleteCustomerMutation = useMutation({
        mutationFn: () => deleteCustomer(customerId),
        onSuccess: () => {
            toast({
                title: "Customer Deleted",
                description: `${customer?.name ?? 'Customer'} has been successfully deleted.`,
                variant: "default",
            });
            queryClient.invalidateQueries({ queryKey: ['customers'] }); // Refetch customer list
            queryClient.invalidateQueries({ queryKey: ['entries'] }); // Refetch entries list
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Refetch dashboard
            router.push('/customers'); // Redirect to customer list
        },
        onError: (error) => {
            toast({
                title: "Error Deleting Customer",
                description: `Failed to delete customer: ${error instanceof Error ? error.message : 'Please try again.'}`,
                variant: "destructive",
            });
        },
        onSettled: () => {
             setIsDeleteDialogOpen(false); // Close dialog regardless of outcome
        }
    });


  const handlePaymentRecorded = (amount: number) => {
      console.log(`[CustomerDetailsPage] handlePaymentRecorded called with amount: ${amount}`);
      recordPaymentMutation.mutate({ amount });
  };

  const handleDeleteConfirm = () => {
      deleteCustomerMutation.mutate();
  };

   const handleRefresh = () => {
        refetchCustomer();
        refetchHistory();
        toast({ title: "Data Refreshed", variant: "default", duration: 2000 });
    };

  const isLoading = isLoadingCustomer || isLoadingHistory;
  const isError = isErrorCustomer || isErrorHistory;
  const error = errorCustomer || errorHistory;

    // Add a fallback in case of mount error
  if (!hasMounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading customer details...</p>
      </div>
    );
  }

  if (isError) {
    return (
        <div className="p-6 text-center text-destructive space-y-4">
            <AlertTriangle className="h-10 w-10 mx-auto"/>
            <p>Error loading customer data.</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'An unknown error occurred.'}</p>
             <Button onClick={handleRefresh} variant="outline">
                <RefreshCcw className="mr-2 h-4 w-4" /> Retry
            </Button>
        </div>
    );
  }

  if (!customer) {
    return <div className="p-6 text-center text-muted-foreground">Customer not found.</div>;
  }

  // Ensure pendingAmount is treated as 0 if null/undefined or negative
  const safePendingAmount = Math.max(0, customer.pendingAmount ?? 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Customer Info & Financial Summary */}
      <Card className="shadow-md rounded-lg">
        <CardHeader className="flex flex-row justify-between items-start">
            <div>
                <CardTitle className="text-2xl">{customer.name}</CardTitle>
                <CardDescription>
                    {customer.mobile} | {customer.village}
                </CardDescription>
            </div>
             {/* Refresh and Delete Buttons */}
             <div className="flex gap-2">
                 <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh data">
                     <RefreshCcw className="h-4 w-4" />
                 </Button>

                 <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete customer">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the customer
                            <span className="font-semibold"> {customer.name}</span> and all their associated water supply entries.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteCustomerMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteCustomerMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                         >
                             {deleteCustomerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {deleteCustomerMutation.isPending ? 'Deleting...' : 'Yes, delete customer'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>

            </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-md bg-secondary/50">
            <p className="text-sm font-medium text-muted-foreground">Total Paid Amount</p>
            <p className="text-xl font-bold text-accent">{formatCurrency(customer.totalPaid)}</p>
          </div>
          <div className="p-4 border rounded-md bg-secondary/50">
            <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
            <p className={`text-xl font-bold ${safePendingAmount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatCurrency(safePendingAmount)}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-4">
          <Button variant="outline" disabled> {/* Add export functionality later */}
            <Download className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
          <Button
            onClick={() => setIsPaymentDialogOpen(true)}
            // Disable if pending amount is zero or less, or if a payment mutation is currently pending
            disabled={safePendingAmount <= 0 || recordPaymentMutation.isPending}
            >
             {recordPaymentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Record Payment
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      {/* Water Supply History */}
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle>Water Supply History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!history || history.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No water supply history found for this customer.
                    </TableCell>
                 </TableRow>
              ) : (
                history.map((entry) => (
                  <TableRow key={entry.id}>
                     {/* Use formatDateRange to display dates */}
                    <TableCell>{formatDateRange(entry.entryTimestamp, entry.endDate)}</TableCell>
                    <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                    <TableCell>{entry.durationHours.toFixed(1)} hr</TableCell>
                    <TableCell>{entry.cropType}</TableCell>
                    <TableCell>{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={entry.isPaid ? 'default' : 'destructive'} className={entry.isPaid ? 'bg-accent text-accent-foreground' : ''}>
                        {entry.isPaid ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       {/* Record Payment Dialog */}
       {/* Conditionally render dialog only when needed and customer exists */}
       {customer && (
            <RecordPaymentDialog
                isOpen={isPaymentDialogOpen}
                onClose={() => setIsPaymentDialogOpen(false)}
                customerName={customer.name}
                pendingAmount={safePendingAmount} // Pass the safe pending amount
                onPaymentRecorded={handlePaymentRecorded}
                customerId={customerId} // Pass customerId if needed inside dialog, though mutation is here
                isSubmitting={recordPaymentMutation.isPending} // Correctly pass submitting state
            />
        )}
    </div>
  );
};

export default CustomerDetailsPage;

    