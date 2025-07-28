
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, Timestamp, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getCropCharge } from '@/services/crop-charge';
import { format } from 'date-fns';

const ENTRIES_COLLECTION = 'waterSupplyEntries';
const CUSTOMERS_COLLECTION = 'customers';

// --- Types ---
export interface WaterSupplyEntry {
    id: string; // Firestore document ID
    customerId: string;
    customerName: string; // Denormalized for easier display
    entryTimestamp: Timestamp; // Represents the *start* time for sorting/querying
    startTime: string; // HH:MM (keep for display) - Represents the start time part
    endTime: string; // HH:MM (keep for display) - Represents the end time part
    endDate: Timestamp; // Added: Timestamp for the end date and time
    durationHours: number;
    cropType: string;
    amount: number;
    isPaid: boolean;
    createdAt?: Timestamp; // Optional: Timestamp of when the entry was added
}

// Data needed to create a new entry (received from form)
export interface NewEntryData {
    customerId: string;
    startDateTime: Date; // Combined start date and time
    endDateTime: Date;   // Combined end date and time
    // startTime/endTime strings are derived from Date objects before saving if needed for display
    startTime: string; // Extracted from startDateTime
    endTime: string;   // Extracted from endDateTime
    cropType: string;
    amount: number; // Calculated amount
    durationHours: number; // Calculated duration
    isPaid: boolean; // Usually false initially
}

// --- API Functions ---

/**
 * Fetches all water supply entries, ordered by timestamp descending.
 * Consider adding pagination for large datasets in a real application.
 */
export async function getWaterSupplyEntries(): Promise<WaterSupplyEntry[]> {
    console.log("API: Getting all water supply entries from Firestore");
    const entriesRef = collection(db, ENTRIES_COLLECTION);
    // Order by start time (entryTimestamp)
    const q = query(entriesRef, orderBy('entryTimestamp', 'desc'));
    try {
        const snapshot = await getDocs(q);
        console.log(`API: Fetched ${snapshot.docs.length} entry documents.`);
        const entriesList = snapshot.docs.map(doc => {
            const data = doc.data();
            // Basic validation - include endDate check
             if (!doc.id || !data.customerId || !data.customerName || !data.entryTimestamp || !data.startTime || !data.endTime || !data.endDate || data.durationHours == null || !data.cropType || data.amount == null || data.isPaid == null) {
                console.warn(`API Warning: Incomplete data for entry document ${doc.id}`, data);
                return null;
            }
            return { id: doc.id, ...data } as WaterSupplyEntry;
        }).filter((entry): entry is WaterSupplyEntry => entry !== null);

        console.log(`API: Returning ${entriesList.length} valid entries.`);
        return entriesList;
    } catch (error) {
        console.error("API Error: Failed to get water supply entries:", error);
        throw error; // Re-throw for query client
    }
}

/**
 * Adds a new water supply entry to Firestore using a transaction.
 * Updates the customer's pending amount atomically.
 */
export async function addWaterSupplyEntry(entryData: NewEntryData): Promise<string> {
    console.log("API: Adding new water supply entry to Firestore:", entryData);
    // Validate the combined Date objects
    if (!entryData.customerId || !entryData.startDateTime || !entryData.endDateTime || !entryData.cropType || entryData.amount == null || entryData.durationHours == null) {
        console.error("API Error: Invalid entry data provided for addition.");
        throw new Error("Invalid entry data. Required fields (customerId, startDateTime, endDateTime, cropType, amount, duration) are missing or invalid.");
    }
    if (entryData.endDateTime <= entryData.startDateTime) {
        console.error("API Error: End date/time must be after start date/time.");
        throw new Error("End date/time must be after start date/time.");
    }


    const entryCollection = collection(db, ENTRIES_COLLECTION);
    const customerRef = doc(db, CUSTOMERS_COLLECTION, entryData.customerId);

    // Use startDateTime directly for the primary timestamp
    const entryTimestamp = Timestamp.fromDate(entryData.startDateTime);
    const endDateTimestamp = Timestamp.fromDate(entryData.endDateTime); // Convert end date too


    try {
        const newEntryId = await runTransaction(db, async (transaction) => {
            console.log(`Transaction[AddEntry]: Starting for customer ${entryData.customerId}`);
            // 1. Get customer document to retrieve name and current pending amount
            const customerSnap = await transaction.get(customerRef);
            if (!customerSnap.exists()) {
                console.error(`Transaction[AddEntry]: Error - Customer ${entryData.customerId} not found.`);
                throw new Error("Customer not found!");
            }
            const customerData = customerSnap.data();
            const currentPendingAmount = customerData.pendingAmount || 0;
            const customerName = customerData.name || 'Unknown Customer'; // Get customer name
            console.log(`Transaction[AddEntry]: Customer ${customerName} found, current pending: ${currentPendingAmount}`);


            // 2. Calculate new pending amount
            // Only increase pending amount if the entry is NOT paid initially (which is typical)
            const newPendingAmount = entryData.isPaid ? currentPendingAmount : currentPendingAmount + entryData.amount;
            console.log(`Transaction[AddEntry]: Calculated new pending: ${newPendingAmount} (entry amount: ${entryData.amount}, isPaid: ${entryData.isPaid})`);

            // 3. Update customer's pending amount
            transaction.update(customerRef, { pendingAmount: newPendingAmount });
            console.log(`Transaction[AddEntry]: Staged customer update.`);

            // 4. Prepare the new entry document data
            const newEntryDocData = {
                customerId: entryData.customerId,
                customerName: customerName, // Store denormalized name
                entryTimestamp: entryTimestamp, // Store the start timestamp
                startTime: format(entryData.startDateTime, "HH:mm"), // Store HH:MM string for display
                endTime: format(entryData.endDateTime, "HH:mm"),   // Store HH:MM string for display
                endDate: endDateTimestamp, // Store the end timestamp
                durationHours: entryData.durationHours,
                cropType: entryData.cropType,
                amount: entryData.amount,
                isPaid: entryData.isPaid, // Usually false
                createdAt: Timestamp.now(), // Add creation timestamp
            };

            // 5. Add the new water supply entry document
            // We need to create a ref first to get the ID *before* setting data in a transaction
            const newEntryRef = doc(entryCollection);
            transaction.set(newEntryRef, newEntryDocData);

            console.log(`Transaction[AddEntry]: Staged new entry creation (ID: ${newEntryRef.id}). Commit pending.`);
            return newEntryRef.id; // Return the auto-generated ID
        });
        console.log(`API: Successfully added entry ${newEntryId} and updated customer ${entryData.customerId}.`);
        return newEntryId;
    } catch (error) {
        console.error("API Error: Transaction failed for addWaterSupplyEntry:", error);
        throw new Error(`Failed to add entry: ${error instanceof Error ? error.message : 'Database transaction failed.'}`);
    }
}


/**
 * Updates an existing water supply entry in Firestore using a transaction.
 * Recalculates and updates the customer's pending amount difference if amount or paid status changes.
 */
 // **Note:** Updating entries that span midnight might require more complex logic
 // if you allow changing the start/end dates/times significantly.
 // This example primarily focuses on amount/paid status updates.
export async function updateWaterSupplyEntry(entryId: string, updateData: Partial<Omit<WaterSupplyEntry, 'id' | 'customerName' | 'createdAt'>>, oldEntryData: WaterSupplyEntry): Promise<void> {
    console.log(`API: Updating entry ${entryId} in Firestore:`, updateData);
     if (!entryId || !updateData || Object.keys(updateData).length === 0) {
        console.error("API Error: Invalid arguments for updateWaterSupplyEntry.");
        throw new Error("Invalid entry ID or update data provided.");
    }
     if (!oldEntryData || !oldEntryData.customerId) {
        console.error("API Error: Missing old entry data or customer ID for update calculation.");
        throw new Error("Internal error: Missing original entry data for update.");
    }

    const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
    const customerRef = doc(db, CUSTOMERS_COLLECTION, oldEntryData.customerId);

     try {
        await runTransaction(db, async (transaction) => {
             console.log(`Transaction[UpdateEntry]: Starting for entry ${entryId}, customer ${oldEntryData.customerId}`);
            // 1. Get customer document to update pending amount
            const customerSnap = await transaction.get(customerRef);
            if (!customerSnap.exists()) {
                 console.error(`Transaction[UpdateEntry]: Error - Customer ${oldEntryData.customerId} not found.`);
                throw new Error("Customer not found for associated entry!");
            }
            const customerData = customerSnap.data();
            let currentPendingAmount = customerData.pendingAmount || 0;
            let pendingAmountAdjustment = 0;
             console.log(`Transaction[UpdateEntry]: Customer found, current pending: ${currentPendingAmount}`);

            // 2. Calculate pending amount adjustment based on changes
            const oldAmount = oldEntryData.amount ?? 0;
            const newAmount = updateData.amount ?? oldAmount; // Use new amount if provided, else old
            const oldIsPaid = oldEntryData.isPaid;
            const newIsPaid = updateData.isPaid ?? oldIsPaid; // Use new status if provided, else old

            // --- Logic for pending amount adjustment ---
            if (oldIsPaid && newIsPaid) pendingAmountAdjustment = 0;
            else if (!oldIsPaid && !newIsPaid) pendingAmountAdjustment = newAmount - oldAmount;
            else if (oldIsPaid && !newIsPaid) pendingAmountAdjustment = newAmount;
            else if (!oldIsPaid && newIsPaid) pendingAmountAdjustment = -oldAmount;
            // --- End Logic ---
             console.log(`Transaction[UpdateEntry]: Calculated pending adjustment: ${pendingAmountAdjustment}`);

            // 3. Apply the update to the entry document
            // Handle potential date/time updates carefully if needed - complex for cross-midnight spans
            let finalUpdateData: Partial<Omit<WaterSupplyEntry, 'id'>> = { ...updateData };
            // * If you allow changing start/end times/dates, you need to recalculate duration,
            // * entryTimestamp, endDate, startTime, endTime string, and potentially amount,
            // * and apply those changes to finalUpdateData. This is complex and omitted for brevity here.
            // * For now, this primarily handles amount/isPaid changes.

            transaction.update(entryRef, finalUpdateData);
             console.log(`Transaction[UpdateEntry]: Staged entry update.`);


            // 4. Apply adjustment to customer's pending amount if needed
            if (pendingAmountAdjustment !== 0) {
                const newPendingAmount = Math.max(0, currentPendingAmount + pendingAmountAdjustment); // Ensure >= 0
                transaction.update(customerRef, { pendingAmount: newPendingAmount });
                console.log(`Transaction[UpdateEntry]: Staged customer pending amount update from ${currentPendingAmount} to ${newPendingAmount} (Adjustment: ${pendingAmountAdjustment}).`);
            } else {
                console.log(`Transaction[UpdateEntry]: No change to customer pending amount needed.`);
            }
             console.log(`Transaction[UpdateEntry]: Finished staging updates. Commit pending.`);
        });
         console.log(`API: Successfully updated entry ${entryId} and potentially customer ${oldEntryData.customerId}.`);
    } catch(error) {
        console.error(`API Error: Transaction failed for updateWaterSupplyEntry ${entryId}:`, error);
        throw new Error(`Failed to update entry: ${error instanceof Error ? error.message : 'Database transaction failed.'}`);
    }
}

/**
 * Deletes a water supply entry using a transaction.
 * Updates the customer's pending amount if the deleted entry was unpaid.
 */
export async function deleteWaterSupplyEntry(entryToDelete: WaterSupplyEntry): Promise<void> {
    console.log(`API: Attempting to delete entry ${entryToDelete?.id} from Firestore`);

    if (!entryToDelete || !entryToDelete.id || !entryToDelete.customerId) {
        console.error("API Error: Invalid entry data provided for deletion. Missing ID or customerId.");
        throw new Error("Invalid entry data provided for deletion.");
    }

    const entryRef = doc(db, ENTRIES_COLLECTION, entryToDelete.id);
    const customerRef = doc(db, CUSTOMERS_COLLECTION, entryToDelete.customerId);

    try {
        await runTransaction(db, async (transaction) => {
            console.log(`Transaction[DeleteEntry]: Starting for entry ${entryToDelete.id}, customer ${entryToDelete.customerId}`);
            // 1. Get entry document to confirm existence and check isPaid status (use passed data as fallback)
            let isPaid = entryToDelete.isPaid;
            let entryAmount = entryToDelete.amount ?? 0; // Use provided amount, default 0

            const entrySnap = await transaction.get(entryRef);
            if (!entrySnap.exists()) {
                 console.warn(`Transaction[DeleteEntry]: Entry ${entryToDelete.id} not found in database. It might have been already deleted.`);
                 // Exit gracefully assuming it's already gone.
                 return; // Exit transaction
            }
            // Use fresh data from DB if available, overriding potentially stale passed data
            const entryDataFromDB = entrySnap.data();
            isPaid = entryDataFromDB.isPaid ?? isPaid;
            entryAmount = entryDataFromDB.amount ?? entryAmount;
             console.log(`Transaction[DeleteEntry]: Entry found in DB. isPaid: ${isPaid}, Amount: ${entryAmount}`);


            // 2. Delete the entry document
            transaction.delete(entryRef);
            console.log(`Transaction[DeleteEntry]: Staged entry deletion.`);


            // 3. Adjust customer's pending amount ONLY if the entry was unpaid
            if (!isPaid) {
                 console.log(`Transaction[DeleteEntry]: Entry was unpaid. Fetching customer to adjust pending amount.`);
                const customerSnap = await transaction.get(customerRef);
                if (customerSnap.exists()) {
                    const customerData = customerSnap.data();
                    const currentPendingAmount = customerData.pendingAmount || 0;
                    // Subtract the entry's amount from the pending amount
                    const newPendingAmount = Math.max(0, currentPendingAmount - entryAmount); // Ensure >= 0
                    transaction.update(customerRef, { pendingAmount: newPendingAmount });
                    console.log(`Transaction[DeleteEntry]: Staged customer pending update from ${currentPendingAmount} to ${newPendingAmount}.`);
                } else {
                    // This case should be rare if customer exists when adding entry, but handle defensively
                    console.warn(`Transaction[DeleteEntry]: Customer ${entryToDelete.customerId} not found when trying to adjust pending amount for deleted entry ${entryToDelete.id}. Pending amount may be inaccurate.`);
                }
            } else {
                console.log(`Transaction[DeleteEntry]: Entry was paid. No change to customer pending amount needed.`);
            }
             console.log(`Transaction[DeleteEntry]: Finished staging updates. Commit pending.`);
        });
        console.log(`API: Successfully completed transaction to delete entry ${entryToDelete.id}.`);
    } catch (error) {
         console.error(`API Error: Transaction failed for deleteWaterSupplyEntry ${entryToDelete.id}:`, error);
        throw new Error(`Failed to delete entry: ${error instanceof Error ? error.message : 'Database transaction failed.'}`);
    }
}


/**
 * Calculates the charge based on time duration and crop type using rates from crop-charge service.
 * @param startDateTime - The start date and time as a Date object.
 * @param endDateTime - The end date and time as a Date object.
 * @param cropType - The type of crop.
 */
export async function calculateCharge(startDateTime: Date, endDateTime: Date, cropType: string): Promise<number> {
    console.log(`API: Calculating charge for ${cropType} from ${format(startDateTime, "yyyy-MM-dd HH:mm")} to ${format(endDateTime, "yyyy-MM-dd HH:mm")}`);

    if (!startDateTime || !endDateTime || isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        console.error("API Error: Invalid start or end date/time provided.");
        throw new Error("Invalid start or end date/time for calculation.");
    }

    if (endDateTime <= startDateTime) {
        console.warn("End time is not after start time.");
        throw new Error("End time must be strictly after start time."); // Throw specific error
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours <= 0) {
        console.warn("Calculated duration is zero or negative.");
        // Depending on business logic, either return 0 or throw an error.
        // Let's throw an error for clarity, as 0 duration usually implies an issue.
        throw new Error("Calculated duration is zero or negative. Check start and end times.");
    }

    try {
        const cropCharge = await getCropCharge(cropType); // Use the central service
        const calculatedAmount = durationHours * cropCharge.chargePerHour;
        console.log(`Duration: ${durationHours.toFixed(2)} hrs, Rate: ${cropCharge.chargePerHour}/hr, Raw Amount: ${calculatedAmount.toFixed(2)}`);
        // Round to nearest whole number (typical for currency)
        const roundedAmount = Math.round(calculatedAmount);
        console.log(`Rounded Amount: ${roundedAmount}`);
        return roundedAmount;
    } catch (error) {
        console.error(`API Error: Error calculating charge for crop type ${cropType}:`, error);
        // Make the error more user-friendly if it's about missing config
        if (error instanceof Error && error.message.includes('configuration missing')) {
           throw new Error(`Could not find charge rate for '${cropType}'. Please check configuration.`);
        }
        throw new Error(`Failed to calculate charge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

    