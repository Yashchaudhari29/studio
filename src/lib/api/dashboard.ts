
import { collection, query, where, getDocs, Timestamp, orderBy, limit, sum, getAggregateFromServer, startAt, endAt, AggregateField, AggregateQuerySnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import type { WaterSupplyEntry } from './entries'; // Import shared type

// Define collection names (ensure consistency)
const ENTRIES_COLLECTION = 'waterSupplyEntries';
const CUSTOMERS_COLLECTION = 'customers';

// Define the structure for dashboard data
export interface DashboardData {
    todaySupplyHours: number;
    todayRevenue: number;
    pendingAmount: number; // Total pending from all customers
    monthlyRevenue: number; // Current month revenue
    sixMonthRevenue: number; // Revenue over the last 6 months
    yearlyRevenue: number;   // Revenue for the current year
    totalRevenue: number;    // All-time revenue
    recentActivity: RecentActivityEntry[];
}

// Define the structure for recent activity entries shown on the dashboard
export interface RecentActivityEntry extends Omit<WaterSupplyEntry, 'customerId' | 'entryTimestamp'> { // Exclude raw customerId if name is shown
    entryTimestamp: Timestamp; // Keep start timestamp
    endDate: Timestamp;        // Keep end timestamp
    timeSlot: string; // Formatted time slot
    status: 'Paid' | 'Pending';
}


// Helper function to calculate sum for a given date range using aggregation
async function aggregateSumForPeriod(
    collectionName: string,
    fieldName: string,
    startDate?: Date, // Make start date optional for all-time sum
    endDate?: Date    // Make end date optional for all-time sum
): Promise<number> {
    const periodDesc = startDate && endDate
        ? `from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
        : 'for all time';
    console.log(`Aggregating '${fieldName}' in '${collectionName}' ${periodDesc}`);

    const targetCollectionRef = collection(db, collectionName);
    let periodQuery = query(targetCollectionRef); // Start with base collection query

    // Apply date range filters if provided
    // For revenue, we likely want to filter based on the entry's *start* time (entryTimestamp)
    if (startDate) {
        periodQuery = query(periodQuery, where('entryTimestamp', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
        // Use '<=' for inclusive end date matching previous logic
        periodQuery = query(periodQuery, where('entryTimestamp', '<=', Timestamp.fromDate(endDate)));
    }


    try {
        const aggregationField = sum(fieldName) as AggregateField<number>;
        const snapshot: AggregateQuerySnapshot<{ total: AggregateField<number> }> =
            await getAggregateFromServer(periodQuery, {
                total: aggregationField
            });
        const result = snapshot.data().total || 0;
        console.log(`Aggregation result for '${fieldName}': ${result}`);
        return result;
    } catch (error) {
        console.error(`Error aggregating '${fieldName}' ${periodDesc}:`, error);

        // Fallback to manual calculation (less efficient)
        console.warn("Falling back to manual sum calculation...");
        let totalSum = 0;
        try {
            const docsSnapshot = await getDocs(periodQuery);
             console.log(`Manual fallback: Fetched ${docsSnapshot.docs.length} documents.`);
            docsSnapshot.forEach(doc => {
                const value = doc.data()?.[fieldName]; // Safe access
                 if (typeof value === 'number' && !isNaN(value)) {
                    totalSum += value;
                 } else {
                    // Optionally log if a field is missing or not a number
                    // console.warn(`Document ${doc.id} missing or has non-numeric value for ${fieldName}:`, value);
                 }
            });
            console.log(`Manual fallback sum for '${fieldName}': ${totalSum}`);
            return totalSum;
        } catch (fallbackError) {
             console.error(`Error during manual fallback calculation for '${fieldName}':`, fallbackError);
             return 0; // Return 0 if both fail
        }
    }
}


export async function getDashboardData(): Promise<DashboardData> {
    console.log("API: Fetching dashboard data from Firestore...");

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Date ranges for revenue stats
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    const sixMonthsAgoStart = startOfDay(subMonths(today, 6)); // Start of day 6 months ago
    const currentYearStart = startOfYear(today);
    const currentYearEnd = endOfYear(today);

    const entriesRef = collection(db, ENTRIES_COLLECTION);
    const customersRef = collection(db, CUSTOMERS_COLLECTION);

    try {
        // --- Fetch Today's Entries Stats ---
         console.log("Fetching today's entries (based on start time)...");
        const todayEntriesQuery = query(
            entriesRef,
            where('entryTimestamp', '>=', Timestamp.fromDate(todayStart)),
            where('entryTimestamp', '<=', Timestamp.fromDate(todayEnd)) // Entries *starting* today
        );

        let todaySupplyHours = 0;
        let todayRevenue = 0;
        // Fetching docs as we need both sum and individual values
        const todayEntriesSnapshot = await getDocs(todayEntriesQuery);
         console.log(`Found ${todayEntriesSnapshot.docs.length} entries starting today.`);
        todayEntriesSnapshot.forEach(doc => {
            const data = doc.data();
             // Add checks for potentially missing fields
             if (typeof data.durationHours === 'number') {
                 todaySupplyHours += data.durationHours;
             }
             if (typeof data.amount === 'number') {
                 todayRevenue += data.amount;
             }
        });
        console.log(`Today's Calculated Stats (Entries starting today) - Hours: ${todaySupplyHours.toFixed(1)}, Revenue: ${formatCurrency(todayRevenue)}`);

        // --- Fetch Total Pending Amount ---
        console.log("Fetching total pending amount...");
        // Query for customers collection, summing the 'pendingAmount' field
        const pendingAmount = await aggregateSumForPeriod(CUSTOMERS_COLLECTION, 'pendingAmount');
        console.log(`Total Pending Amount: ${formatCurrency(pendingAmount)}`);


        // --- Calculate Revenue Stats Concurrently ---
         console.log("Calculating revenue stats concurrently (based on entry start time)...");
        const [
            monthlyRevenue,
            sixMonthRevenue,
            yearlyRevenue,
            totalRevenue // Use aggregation for total
        ] = await Promise.all([
             aggregateSumForPeriod(ENTRIES_COLLECTION,'amount', currentMonthStart, currentMonthEnd),
             aggregateSumForPeriod(ENTRIES_COLLECTION,'amount', sixMonthsAgoStart, todayEnd), // From 6 months ago up to today
             aggregateSumForPeriod(ENTRIES_COLLECTION,'amount', currentYearStart, currentYearEnd),
             aggregateSumForPeriod(ENTRIES_COLLECTION,'amount', undefined, todayEnd) // For all time (no start date)
        ]);
         console.log(`Revenue - Monthly: ${formatCurrency(monthlyRevenue)}, 6-Month: ${formatCurrency(sixMonthRevenue)}, Yearly: ${formatCurrency(yearlyRevenue)}, Total: ${formatCurrency(totalRevenue)}`);


        // --- Fetch Recent Activity ---
         console.log("Fetching recent activity...");
        const recentQuery = query(
            entriesRef,
            orderBy('entryTimestamp', 'desc'), // Order by start timestamp descending
            limit(5) // Limit to last 5 entries
        );
        const recentSnapshot = await getDocs(recentQuery);
        const recentActivity: RecentActivityEntry[] = recentSnapshot.docs.map(doc => {
            const data = doc.data() as WaterSupplyEntry; // Cast to the correct type
             // Add checks for required fields before mapping (include endDate)
            if (!data || !data.customerName || !data.startTime || !data.endTime || data.amount == null || data.isPaid == null || !data.entryTimestamp || !data.endDate) {
                 console.warn(`Recent activity entry ${doc.id} has missing data, skipping.`);
                 return null; // Skip this entry
             }
            return {
                 id: doc.id,
                 customerName: data.customerName,
                 entryTimestamp: data.entryTimestamp, // Include the start timestamp
                 endDate: data.endDate,              // Include the end timestamp
                 startTime: data.startTime,
                 endTime: data.endTime,
                 durationHours: data.durationHours ?? 0, // Default if missing
                 cropType: data.cropType ?? 'N/A', // Default if missing
                 amount: data.amount,
                 isPaid: data.isPaid,
                 // Add calculated fields for display
                 timeSlot: `${data.startTime}-${data.endTime}`,
                 status: data.isPaid ? 'Paid' : 'Pending'
            }
        }).filter((entry): entry is RecentActivityEntry => entry !== null); // Filter out null entries

        console.log(`Fetched ${recentActivity.length} recent activities.`);

         const dashboardResult: DashboardData = {
            todaySupplyHours,
            todayRevenue,
            pendingAmount, // Use the reliably calculated pending amount
            monthlyRevenue,
            sixMonthRevenue,
            yearlyRevenue,
            totalRevenue,
            recentActivity,
        };
         console.log("API: Dashboard data fetched successfully:", dashboardResult);
         return dashboardResult;

    } catch (error) {
         console.error("API Error: Failed to fetch dashboard data:", error);
          throw new Error(`Failed to fetch dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

    