

"use client"; // Required for TanStack Query hooks

import type { NextPage } from 'next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Added Button
import { Hourglass, IndianRupee, Droplets, Loader2, AlertTriangle, RefreshCcw, CalendarDays, CalendarRange, Calendar, Database } from 'lucide-react'; // Added more icons
import { getDashboardData } from '@/lib/api/dashboard'; // Use updated API
import type { DashboardData, RecentActivityEntry } from '@/lib/api/dashboard'; // Import updated type
import { Timestamp } from 'firebase/firestore'; // Import Timestamp
import { format } from 'date-fns'; // Import date-fns format
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Skeleton } from "@/components/ui/skeleton"; // Import the actual Skeleton component
import { cn } from "@/lib/utils"; // Import cn utility


// Function to format currency
const formatCurrency = (amount: number | null | undefined) => {
   if (amount == null || isNaN(amount)) {
     return '₹ N/A'; // Indicate not available
   }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

// Function to format date for recent activity
const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    if (isNaN(date.getTime())) return 'Invalid Date';
    // Format date without year for recent activity might be cleaner
    return format(date, 'dd MMM'); // e.g., 15 Jul
};


const DashboardPage: NextPage = () => {
   const { toast } = useToast();

  // Fetch dashboard data using TanStack Query
  const { data: dashboardData, isLoading, isError, error, refetch, isFetching } = useQuery<DashboardData>({ // Use updated type
    queryKey: ['dashboardData'], // Unique key for this query
    queryFn: getDashboardData,
    // Add options for better UX
    refetchOnWindowFocus: true, // Refetch on window focus for freshness
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
  });

   const handleRefresh = () => {
        refetch(); // Trigger refetch
        toast({ title: "Refreshing Dashboard...", variant: "default", duration: 2000 });
    };

    // Determine overall loading state (initial load or background fetching)
    const showLoadingState = isLoading || (isFetching && !dashboardData);

    // Determine if there's a pending amount (handle null/undefined defensively)
    const hasPendingAmount = dashboardData?.pendingAmount != null && dashboardData.pendingAmount > 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Refresh Button */}
         <div className="flex justify-end">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
        </div>

        {/* Show Error State */}
         {isError && !isLoading && ( // Show error only if not initial loading
             <Card className="shadow-md rounded-lg border-destructive bg-destructive/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-destructive">
                    <CardTitle className="text-lg font-semibold">Error Loading Dashboard</CardTitle>
                    <AlertTriangle className="h-6 w-6" />
                </CardHeader>
                <CardContent>
                     <p>There was an issue fetching the dashboard data.</p>
                    <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : 'An unknown error occurred.'}</p>
                    <Button onClick={handleRefresh} variant="destructive" size="sm" className="mt-4" disabled={isFetching}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
                    </Button>
                </CardContent>
             </Card>
         )}

      {/* Quick Stats Cards - Using Grid */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showLoadingState ? (
            // Skeletons for all 7 cards during loading
            [...Array(7)].map((_, i) => (
                <Card key={i} className="shadow-md rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardContent>
                </Card>
            ))
           ) : dashboardData && !isError ? ( // Render cards only if data exists and no error
            <>
                {/* Today's Stats */}
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Supply Hours</CardTitle>
                        <Hourglass className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardData.todaySupplyHours.toFixed(1)} Hours</div>
                        <p className="text-xs text-muted-foreground">Total water supplied today</p>
                    </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                        <IndianRupee className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardData.todayRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Total earnings today</p>
                    </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pending Payments</CardTitle>
                        <Droplets className={`h-5 w-5 ${hasPendingAmount ? 'text-destructive' : 'text-accent'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${hasPendingAmount ? 'text-destructive' : 'text-accent'}`}>
                             {/* Handle potential null/undefined for pendingAmount gracefully */}
                            {formatCurrency(dashboardData.pendingAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total amount due from all customers</p>
                    </CardContent>
                </Card>

                {/* Periodical Revenue Stats */}
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month's Revenue</CardTitle>
                        <CalendarDays className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardData.monthlyRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Revenue in {format(new Date(), 'MMMM')}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last 6 Months' Revenue</CardTitle>
                        <CalendarRange className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardData.sixMonthRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Total revenue over past 6 months</p>
                    </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Year's Revenue</CardTitle>
                        <Calendar className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardData.yearlyRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Total revenue in {format(new Date(), 'yyyy')}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue (All Time)</CardTitle>
                        <Database className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Total recorded revenue ever</p>
                    </CardContent>
                </Card>
            </>
           ) : null /* Don't render cards if loading or error */ }
       </div>


      {/* Recent Activity Table */}
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <CardHeader>
          <CardTitle>Recent Water Supply Activity</CardTitle>
          <CardDescription>Showing the last few water supply entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {showLoadingState ? (
             <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-5/6" />
                <Skeleton className="h-8 w-full" />
             </div>
          ) : isError && dashboardData?.recentActivity.length === 0 ? ( // Show error for activity if no data shown
              <div className="text-center text-destructive py-10">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2"/>
                  Error loading recent activity.
              </div>
          ) : !dashboardData || dashboardData.recentActivity.length === 0 ? ( // No data message
               <div className="text-center text-muted-foreground py-10">
                  No recent activity found.
               </div>
          ) : ( // Render table if data exists
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Time Slot</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {dashboardData.recentActivity.map((activity: RecentActivityEntry) => (
                    <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.customerName}</TableCell>
                     <TableCell className="hidden md:table-cell">{formatDate(activity.entryTimestamp)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{activity.timeSlot}</TableCell>
                    <TableCell>{activity.cropType}</TableCell>
                    <TableCell>{formatCurrency(activity.amount)}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={activity.status === 'Paid' ? 'default' : 'destructive'} className={cn(activity.status === 'Paid' ? 'bg-accent text-accent-foreground' : '')}>
                        {activity.status}
                        </Badge>
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

export default DashboardPage;
