
import { collection, query, where, orderBy, getDocs, Timestamp, documentId } from 'firebase/firestore'; // Import documentId
import { db } from '@/lib/firebase/config';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns'; // Import date-fns functions
import { WaterSupplyEntry } from './entries'; // Import Entry type

const ENTRIES_COLLECTION = 'waterSupplyEntries';
// const CUSTOMERS_COLLECTION = 'customers'; // Not needed if customerName is denormalized


// --- Types ---
export interface ReportFilters {
    customerId?: string; // 'all' or specific customer ID
    startDate?: Date;
    endDate?: Date;
    // Potentially add cropType filter later
}

// Use the existing WaterSupplyEntry type for report data
export type ReportEntry = WaterSupplyEntry;


// --- API Functions ---

/**
 * Fetches water supply entries from Firestore based on provided filters.
 */
export async function getFilteredEntries(filters: ReportFilters): Promise<ReportEntry[]> {
    console.log("API: Getting filtered entries from Firestore with filters:", filters);

    try {
        let entriesQuery = query(collection(db, ENTRIES_COLLECTION), orderBy('entryTimestamp', 'desc')); // Base query, order by start time descending

        // Apply filters
        if (filters.customerId && filters.customerId !== 'all') {
             console.log(`API: Applying customer filter: ${filters.customerId}`);
            entriesQuery = query(entriesQuery, where('customerId', '==', filters.customerId));
        }
        // Filter based on the START time falling within the selected date range
        if (filters.startDate) {
            const start = startOfDay(filters.startDate);
            const startTimestamp = Timestamp.fromDate(start);
             console.log(`API: Applying start date filter: >= ${format(start, 'yyyy-MM-dd HH:mm:ss')}`);
            entriesQuery = query(entriesQuery, where('entryTimestamp', '>=', startTimestamp));
        }
        if (filters.endDate) {
            const end = endOfDay(filters.endDate);
            const endTimestamp = Timestamp.fromDate(end);
             console.log(`API: Applying end date filter: <= ${format(end, 'yyyy-MM-dd HH:mm:ss')}`);
            // Still filter based on start time being within the range
            entriesQuery = query(entriesQuery, where('entryTimestamp', '<=', endTimestamp));
        }

        const snapshot = await getDocs(entriesQuery);
        const entries = snapshot.docs.map(doc => {
             const data = doc.data();
             // Basic validation for required fields, including endDate
             if (!doc.id || !data.customerId || !data.customerName || !data.entryTimestamp || !data.endDate || !data.startTime || !data.endTime || data.durationHours == null || !data.cropType || data.amount == null || data.isPaid == null) {
                 console.warn(`API Warning: Incomplete data for entry document ${doc.id} in report`, data);
                 return null; // Filter out invalid entries
             }
             return {
                 id: doc.id,
                 ...data,
                 entryTimestamp: data.entryTimestamp instanceof Timestamp ? data.entryTimestamp : Timestamp.now(), // Ensure start is Timestamp
                 endDate: data.endDate instanceof Timestamp ? data.endDate : Timestamp.now(), // Ensure end is Timestamp
             } as ReportEntry;
         }).filter((entry): entry is ReportEntry => entry !== null); // Filter out nulls

         console.log(`API: Found ${entries.length} valid entries matching filters.`);
         return entries;

    } catch (error) {
         console.error("API Error: Failed to get filtered entries:", error);
         throw error; // Re-throw for TanStack Query to handle
    }
}

/**
 * Exports the filtered entries to a CSV file Blob.
 */
export async function exportEntries(filters: ReportFilters): Promise<Blob> {
    console.log("API: Exporting entries with filters:", filters);

    try {
        // 1. Fetch the filtered data
        const dataToExport = await getFilteredEntries(filters);

        if (dataToExport.length === 0) {
             console.warn("API: No data found to export for the selected filters.");
            throw new Error("No data to export for the selected filters.");
        }

        // 2. Format data into CSV string
        const headers = ["Start Date", "End Date", "Customer", "Start Time", "End Time", "Duration (hrs)", "Crop Type", "Amount (INR)", "Status"];
        const rows = dataToExport.map(entry => {
            const startDateStr = entry.entryTimestamp ? format(entry.entryTimestamp.toDate(), 'yyyy-MM-dd') : 'N/A';
            // Format end date only if different from start date
            const endDateStr = entry.endDate && entry.entryTimestamp && !isSameDay(entry.entryTimestamp.toDate(), entry.endDate.toDate())
                ? format(entry.endDate.toDate(), 'yyyy-MM-dd')
                : startDateStr; // Show only start date if same day

            return [
                startDateStr,
                endDateStr, // Use potentially different end date
                `"${(entry.customerName || 'N/A').replace(/"/g, '""')}"`, // Handle potential commas/quotes
                entry.startTime || 'N/A',
                entry.endTime || 'N/A',
                entry.durationHours?.toFixed(2) ?? 'N/A',
                entry.cropType || 'N/A',
                entry.amount?.toFixed(0) ?? 'N/A',
                entry.isPaid ? 'Paid' : 'Pending'
            ];
        });


        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        console.log(`API: Generated CSV for ${dataToExport.length} entries.`);

        // 3. Create a Blob
        // Add BOM for better Excel compatibility with UTF-8 characters
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        return blob;

    } catch (error) {
         console.error("API Error: Failed to export entries:", error);
         // Re-throw the original error or a new one
         throw new Error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

    