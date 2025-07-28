
/**
 * Represents the charge rate per hour for a specific crop type.
 */
export interface CropCharge {
  /**
   * The crop type (e.g., Rice, Wheat).
   */
  cropType: string;
  /**
   * The charge rate per hour for the specified crop type.
   */
  chargePerHour: number;
}

// Mock database/configuration for crop charges
// Consider moving this to Firebase Remote Config or Firestore later
const cropChargeRates: { [key: string]: number } = {
  "Rice": 200,
  "Wheat": 150,
  "Sugarcane": 180,
  "Cotton": 160,
  "Vegetables": 140,
  "Other": 130, // Default rate for unspecified crops
};

/**
 * Asynchronously retrieves the charge rate per hour for a given crop type.
 *
 * Simulates fetching data, potentially from a remote config or database.
 *
 * @param cropType The type of crop for which to retrieve the charge rate.
 * @returns A promise that resolves to a CropCharge object containing the crop type and charge per hour.
 * @throws Error if the crop type is not found and no default 'Other' rate is defined.
 */
export async function getCropCharge(cropType: string): Promise<CropCharge> {
  console.log(`Service: Fetching charge for crop type "${cropType}"`);
  // Simulate network delay or database lookup
  await new Promise(resolve => setTimeout(resolve, 50)); // Short delay

  const rate = cropChargeRates[cropType] ?? cropChargeRates["Other"];

  if (rate === undefined) {
    // This should ideally not happen if "Other" is defined, but good practice to check
    console.error(`Crop charge rate not found for type: ${cropType}, and no default 'Other' rate exists.`);
    throw new Error(`Charge rate configuration missing for crop type: ${cropType}`);
  }

  console.log(`Service: Found rate ${rate} for ${cropType}`);
  return {
    cropType: cropType,
    chargePerHour: rate,
  };
}

/**
 * Retrieves the list of available crop types from the configuration.
 *
 * @returns A promise that resolves to an array of strings representing the available crop types.
 */
export async function getAvailableCropTypes(): Promise<string[]> {
   console.log("Service: Fetching available crop types");
   // Simulate fetching types (e.g., from config)
   await new Promise(resolve => setTimeout(resolve, 50));
   return Object.keys(cropChargeRates);
}

