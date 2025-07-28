
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, Timestamp, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const CUSTOMERS_COLLECTION = 'customers';
const ENTRIES_COLLECTION = 'waterSupplyEntries'; // Define entry collection name for transactions

// --- Types ---
// Customer structure in Firestore and for the app
export interface Customer {
    id: string; // Document ID from Firestore
    name: string;
    mobile: string;
    village: string;
    totalPaid: number;
    pendingAmount: number;
    createdAt: Timestamp; // Track creation time
}

// Data needed to create a new customer
export interface NewCustomerData {
    name: string;
    mobile: string;
    village: string;
}

// Structure of water supply entries (needed for payment logic and history)
export interface WaterSupplyEntry {
    id: string;
    customerId: string;
    customerName: string;
    entryTimestamp: Timestamp; // Start timestamp
    endDate: Timestamp;        // End timestamp
    startTime: string;         // HH:MM start time
    endTime: string;           // HH:MM end time
    durationHours: number;
    cropType: string;
    amount: number;
    isPaid: boolean;
    createdAt?: Timestamp;     // Optional createdAt field
}


// --- API Functions ---

/**
 * Fetches all customers, ordered by creation date.
 */
export async function getCustomers(): Promise<Customer[]> {
    console.log("API: Getting all customers from Firestore...");
    try {
        const customersRef = collection(db, CUSTOMERS_COLLECTION);
        // Order by name for better display, could also order by createdAt
        const q = query(customersRef, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        console.log(`API: Fetched ${snapshot.docs.length} customer documents.`);

        const customersList = snapshot.docs.map(doc => {
            const data = doc.data();
            // Basic validation to ensure core fields exist
             if (!doc.id || !data.name || !data.mobile || !data.village || data.totalPaid == null || data.pendingAmount == null || !data.createdAt) {
                 console.warn(`API Warning: Incomplete data for customer document ${doc.id}`, data);
                 return null; // Filter out invalid data later
             }
             return {
                 id: doc.id,
                 name: data.name,
                 mobile: data.mobile,
                 village: data.village,
                 totalPaid: data.totalPaid,
                 pendingAmount: data.pendingAmount,
                 createdAt: data.createdAt, // Ensure it's a Timestamp
             } as Customer;
         }).filter((customer): customer is Customer => customer !== null); // Filter out nulls

         console.log(`API: Returning ${customersList.length} valid customers.`);
         return customersList;

    } catch (error) {
        console.error("API Error: Failed to get customers:", error);
        throw error; // Re-throw the error to be caught by TanStack Query
    }
}

/**
 * Fetches details for a single customer.
 */
export async function getCustomerDetails(customerId: string): Promise<Customer | null> {
    console.log(`API: Getting details for customer ${customerId} from Firestore...`);
    try {
        const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
             const data = docSnap.data();
             // Basic validation
             if (!docSnap.id || !data.name || !data.mobile || !data.village || data.totalPaid == null || data.pendingAmount == null || !data.createdAt) {
                 console.warn(`API Warning: Incomplete data for customer ${customerId}`, data);
                 return null; // Indicate data issue
             }
            console.log(`API: Found details for customer ${customerId}.`);
            return { id: docSnap.id, ...data } as Customer;
        } else {
            console.log(`API: Customer ${customerId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`API Error: Failed to get customer details for ${customerId}:`, error);
        throw error;
    }
}

/**
 * Fetches water supply history for a specific customer, ordered by date descending.
 */
export async function getCustomerSupplyHistory(customerId: string): Promise<WaterSupplyEntry[]> {
    console.log(`API: Getting supply history for customer ${customerId} from Firestore...`);
    try {
        const entriesRef = collection(db, ENTRIES_COLLECTION);
        const q = query(
            entriesRef,
            where('customerId', '==', customerId),
            orderBy('entryTimestamp', 'desc') // Order by start timestamp descending
        );
        const snapshot = await getDocs(q);
        console.log(`API: Fetched ${snapshot.docs.length} history entry documents for customer ${customerId}.`);

         const history = snapshot.docs.map(doc => {
             const data = doc.data();
             // Basic validation including endDate
             if (!doc.id || !data.customerId || !data.customerName || !data.entryTimestamp || !data.endDate || !data.startTime || !data.endTime || data.durationHours == null || !data.cropType || data.amount == null || data.isPaid == null) {
                 console.warn(`API Warning: Incomplete data for entry document ${doc.id}`, data);
                 return null; // Filter out invalid entries
             }
             return {
                 id: doc.id,
                 ...data
             } as WaterSupplyEntry;
         }).filter((entry): entry is WaterSupplyEntry => entry !== null); // Filter out nulls

         console.log(`API: Returning ${history.length} valid history entries for customer ${customerId}.`);
         return history;
    } catch (error) {
        console.error(`API Error: Failed to get supply history for ${customerId}:`, error);
        throw error;
    }
}

/**
 * Adds a new customer to Firestore.
 */
export async function addCustomer(customerData: NewCustomerData): Promise<string> {
    console.log("API: Attempting to add new customer to Firestore:", customerData);
    if (!customerData || !customerData.name || !customerData.mobile || !customerData.village) {
        console.error("API Error: Invalid customer data provided for addition.");
        throw new Error("Invalid customer data. Name, mobile, and village are required.");
    }
    try {
        const customersRef = collection(db, CUSTOMERS_COLLECTION);
        const newCustomerDoc = {
            name: customerData.name.trim(), // Trim whitespace
            mobile: customerData.mobile.trim(),
            village: customerData.village.trim(),
            totalPaid: 0,
            pendingAmount: 0,
            createdAt: Timestamp.now() // Add creation timestamp
        };
        const docRef = await addDoc(customersRef, newCustomerDoc);
        console.log(`API: Successfully added customer ${newCustomerDoc.name} with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error("API Error: Failed to add customer:", error);
        // Consider more specific error handling or re-throwing
        throw new Error(`Failed to add customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Updates an existing customer in Firestore.
 */
export async function updateCustomer(customerId: string, updateData: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
    console.log(`API: Updating customer ${customerId} in Firestore:`, updateData);
    if (!customerId || !updateData || Object.keys(updateData).length === 0) {
        console.error("API Error: Invalid arguments for updateCustomer.");
        throw new Error("Invalid customer ID or update data provided.");
    }
    try {
        const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
        await updateDoc(docRef, updateData);
        console.log(`API: Successfully updated customer ${customerId}.`);
    } catch (error) {
        console.error(`API Error: Failed to update customer ${customerId}:`, error);
        throw error;
    }
}

/**
 * Records a payment for a customer using a Firestore transaction.
 * Updates the customer's totalPaid and pendingAmount.
 * Updates the status of related unpaid entries, marking them as paid oldest first.
 */
export async function recordPayment(customerId: string, paymentAmount: number): Promise<void> {
    console.log(`API: Recording payment of ${paymentAmount} for customer ${customerId} using transaction...`);
    if (!customerId || typeof paymentAmount !== 'number' || paymentAmount <= 0) {
        console.error("API Error: Invalid arguments for recordPayment. Customer ID and positive amount required.");
        throw new Error("Invalid customer ID or payment amount provided.");
    }

    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    const entriesRef = collection(db, ENTRIES_COLLECTION);

    try {
        await runTransaction(db, async (transaction) => {
            console.log(`Transaction[${customerId}]: Starting payment record.`);

            // 1. Get customer document and validate
            const customerSnap = await transaction.get(customerRef);
            if (!customerSnap.exists()) {
                console.error(`Transaction[${customerId}]: Error - Customer not found.`);
                throw new Error("Customer not found");
            }
            const customer = customerSnap.data() as Omit<Customer, 'id'>;
            const currentTotalPaid = customer.totalPaid ?? 0;
            const currentPendingAmount = customer.pendingAmount ?? 0;
            console.log(`Transaction[${customerId}]: Fetched customer data (Paid: ${currentTotalPaid}, Pending: ${currentPendingAmount}).`);

             // Optional: Check if payment exceeds pending amount - adjust if business logic requires
             // if (paymentAmount > currentPendingAmount) {
             //     console.warn(`Transaction[${customerId}]: Warning - Payment amount (${paymentAmount}) exceeds pending amount (${currentPendingAmount}). Adjusting payment to pending amount.`);
             //     paymentAmount = currentPendingAmount;
             // }

            // 2. Calculate new customer totals
            const newTotalPaid = currentTotalPaid + paymentAmount;
            const newPendingAmount = Math.max(0, currentPendingAmount - paymentAmount); // Ensure pending amount doesn't go below 0
            console.log(`Transaction[${customerId}]: Calculated new totals (Paid: ${newTotalPaid}, Pending: ${newPendingAmount}).`);

            // 3. Stage customer document update
            transaction.update(customerRef, {
                totalPaid: newTotalPaid,
                pendingAmount: newPendingAmount,
            });
            console.log(`Transaction[${customerId}]: Staged customer update.`);

            // 4. Find unpaid entries for this customer, oldest first
            console.log(`Transaction[${customerId}]: Querying unpaid entries...`);
            const unpaidEntriesQuery = query(
                entriesRef,
                where('customerId', '==', customerId),
                where('isPaid', '==', false),
                orderBy('entryTimestamp', 'asc') // Process oldest first (by start time)
            );

            // Get docs outside the transaction for efficiency, but process refs inside
            const unpaidEntriesSnap = await getDocs(unpaidEntriesQuery);
            console.log(`Transaction[${customerId}]: Found ${unpaidEntriesSnap.docs.length} unpaid entries.`);

            let remainingAmountToApply = paymentAmount;

            // 5. Iterate and stage updates for unpaid entries
            for (const entryDoc of unpaidEntriesSnap.docs) {
                if (remainingAmountToApply <= 0) {
                    console.log(`Transaction[${customerId}]: Payment fully applied, stopping entry update loop.`);
                    break;
                }

                const entryRef = doc(db, ENTRIES_COLLECTION, entryDoc.id); // Ref for transaction update
                const entryData = entryDoc.data() as Omit<WaterSupplyEntry, 'id'>;
                const entryAmount = entryData.amount ?? 0; // Default to 0 if missing

                // Validate entry amount
                if (entryAmount <= 0) {
                    console.warn(`Transaction[${customerId}]: Skipping entry ${entryDoc.id} with zero or invalid amount (${entryAmount}).`);
                    continue;
                }

                if (remainingAmountToApply >= entryAmount) {
                    // Mark this entire entry as paid
                    transaction.update(entryRef, { isPaid: true });
                    remainingAmountToApply -= entryAmount;
                    console.log(`Transaction[${customerId}]: Staged full payment update for entry ${entryDoc.id} (Amount: ${entryAmount}). Remaining payment: ${remainingAmountToApply}`);
                } else {
                    // Partial payment scenario - current business logic is entry remains pending
                    console.log(`Transaction[${customerId}]: Partial payment (${remainingAmountToApply}) towards entry ${entryDoc.id} (Amount: ${entryAmount}). Entry remains pending. Stopping application here.`);
                    // Stop applying payment if it only covers part of an entry
                    remainingAmountToApply = 0; // Set to 0 to break the loop
                    break;
                }
            }

            // Log if any payment amount is left over after applying to entries
            if (remainingAmountToApply > 0) {
                console.warn(`Transaction[${customerId}]: Payment application finished, but ${remainingAmountToApply} amount remained unapplied (possibly due to partial payment rules or exceeding total pending). Final customer pending amount is ${newPendingAmount}.`);
            }
            console.log(`Transaction[${customerId}]: Finished staging updates. Final calculated pending amount: ${newPendingAmount}.`);
        });
        console.log(`API: Transaction for payment record for customer ${customerId} committed successfully.`);
    } catch (error) {
        console.error(`API Error: Failed to record payment for ${customerId}:`, error);
        // Provide a more specific error message if possible
        if (error instanceof Error && error.message === "Customer not found") {
             throw new Error("Could not record payment: Customer not found.");
        }
        throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : 'Database transaction failed.'}`);
    }
}


/**
 * Deletes a customer and all their associated water supply entries using a batch write.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
    console.log(`API: Starting deletion process for customer ${customerId} and their entries...`);
     if (!customerId) {
         console.error("API Error: Invalid customer ID for deletion.");
         throw new Error("Invalid customer ID provided for deletion.");
     }

    const batch = writeBatch(db);
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);

    try {
        // Check if customer exists before attempting deletion (optional but good practice)
        const customerSnap = await getDoc(customerRef);
        if (!customerSnap.exists()) {
            console.warn(`API: Customer ${customerId} not found. Skipping deletion.`);
            return; // Or throw an error if desired
        }

        // 1. Mark the customer document for deletion
        batch.delete(customerRef);
        console.log(`Batch[${customerId}]: Marked customer document for deletion.`);

        // 2. Find all entries for this customer
        console.log(`Batch[${customerId}]: Querying entries for deletion...`);
        const entriesRef = collection(db, ENTRIES_COLLECTION);
        const entriesQuery = query(entriesRef, where('customerId', '==', customerId));
        const entriesSnapshot = await getDocs(entriesQuery);
        console.log(`Batch[${customerId}]: Found ${entriesSnapshot.size} entries to delete.`);


        // 3. Mark each entry document for deletion
        entriesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
            // console.log(`Batch: Marking entry ${doc.id} for deletion.`); // Log only if needed, can be verbose
        });

        // 4. Commit the batch
        await batch.commit();
        console.log(`API: Successfully deleted customer ${customerId} and ${entriesSnapshot.size} associated entries.`);
    } catch(error) {
        console.error(`API Error: Failed to delete customer ${customerId} or their entries:`, error);
        throw error; // Re-throw to be handled by mutation caller
    }
}

    