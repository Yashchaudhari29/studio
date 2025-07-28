
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay, addDays } from "date-fns"; // Import more date-fns functions
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getCustomers } from '@/lib/api/customers'; // API function
import { addWaterSupplyEntry, calculateCharge } from '@/lib/api/entries'; // API functions
import { getAvailableCropTypes } from '@/services/crop-charge'; // Service function
import type { Customer } from '@/lib/api/customers'; // Type
import { TimePicker } from '@/components/ui/time-picker'; // Import the TimePicker

// --- Form Schema ---
// Helper function to combine date and time into a single Date object
const combineDateTime = (datePart: Date | undefined, timePart: Date | undefined): Date | undefined => {
    if (!datePart || !timePart) return undefined;
    // Ensure datePart only contains the date portion
    const dateOnly = startOfDay(datePart);
    return setHours(
        setMinutes(
            setSeconds(
                 setMilliseconds(dateOnly, 0), // Zero out smaller units first
                 timePart.getSeconds()
            ),
            timePart.getMinutes()
        ),
        timePart.getHours()
    );
};


// Updated schema to include endDate and refine based on combined start/end DateTime
const entryFormSchema = z.object({
  customerId: z.string({ required_error: "Please select a customer." }).min(1, "Please select a customer."),
  startDate: z.date({ required_error: "Please select a start date." }),
  startTime: z.date({ required_error: "Please select a start time." }),
  endDate: z.date({ required_error: "Please select an end date." }), // Added endDate
  endTime: z.date({ required_error: "Please select an end time." }),
  cropType: z.string({ required_error: "Please select a crop type." }).min(1, "Please select a crop type."),
}).refine(data => {
    // Combine date and time parts into full Date objects
    const startDateTime = combineDateTime(data.startDate, data.startTime);
    const endDateTime = combineDateTime(data.endDate, data.endTime);

    // Ensure both combined dates are valid before comparing
    if (startDateTime instanceof Date && !isNaN(startDateTime.getTime()) &&
        endDateTime instanceof Date && !isNaN(endDateTime.getTime())) {
         return endDateTime.getTime() > startDateTime.getTime();
    }
    // If combination fails or results in invalid dates, let individual field validation handle it
    return true; // Avoid premature failure if individual fields are still being filled
}, {
  message: "End date and time must be after start date and time.",
  path: ["endTime"], // Apply error message to endTime field
});


type EntryFormValues = z.infer<typeof entryFormSchema>;

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

// --- Component ---
const NewEntryPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // --- TanStack Query Hooks ---
  const { data: customers, isLoading: isLoadingCustomers, isError: isErrorCustomers, error: errorCustomers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: cropTypes, isLoading: isLoadingCropTypes, isError: isErrorCropTypes, error: errorCropTypes } = useQuery<string[]>({
    queryKey: ['cropTypes'],
    queryFn: getAvailableCropTypes,
  });

   // Mutation for adding entry
  const addEntryMutation = useMutation({
     mutationFn: addWaterSupplyEntry, // Expects { startDateTime, endDateTime, ... }
     onSuccess: (newEntryId, variables) => {
       console.log("Mutation Success: Entry added with ID", newEntryId);
       toast({
         title: "Entry Added",
         description: `Water supply entry saved successfully. Amount: ₹${variables.amount.toFixed(0)}`,
         variant: "default",
       });
       // Invalidate queries to refetch data on relevant pages
       queryClient.invalidateQueries({ queryKey: ['entries'] });
       queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] }); // Customer details
       queryClient.invalidateQueries({ queryKey: ['customerHistory', variables.customerId] }); // Customer history
       queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Dashboard data
       queryClient.invalidateQueries({ queryKey: ['customers'] }); // Customer list (pending amounts update)
       router.push('/entries'); // Navigate back to entries list
     },
     onError: (error) => {
       console.error("Mutation Error: Failed to add entry:", error);
       toast({
         title: "Error Saving Entry",
         description: error instanceof Error ? error.message : "Could not save the entry. Please try again.",
         variant: "destructive",
       });
       setCalculatedAmount(null); // Clear calculation on error
     }
  });

  // --- React Hook Form ---
  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      customerId: undefined,
      startDate: new Date(), // Default to today
      startTime: undefined,
      endDate: new Date(), // Default end date to same as start date initially
      endTime: undefined,
      cropType: undefined,
    },
    mode: "onChange", // Validate on change for immediate feedback
  });

  const { watch, trigger, formState: { errors, isValid, isDirty }, control, handleSubmit, setValue } = form;
  const watchedStartDate = watch("startDate");
  const watchedStartTime = watch("startTime");
  const watchedEndDate = watch("endDate");
  const watchedEndTime = watch("endTime");
  const watchedCropType = watch("cropType");

   // --- Sync End Date Default ---
   // When startDate changes, default endDate to the same day
   useEffect(() => {
      if (watchedStartDate) {
          setValue('endDate', watchedStartDate, { shouldValidate: true, shouldDirty: true });
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [watchedStartDate]); // Only run when startDate changes


   // --- Logging Form State ---
   useEffect(() => {
     console.log("Form State Update:");
     console.log("  isValid:", isValid);
     console.log("  isDirty:", isDirty);
     console.log("  Errors:", errors);
     console.log("  Watched Values:", { watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime, watchedCropType });
     console.log("  Calculation State:", { isCalculating, calculatedAmount });
     console.log("  Mutation Pending:", addEntryMutation.isPending);
     console.log("  Button Disabled:", addEntryMutation.isPending || isCalculating || calculatedAmount === null || !isValid);
   }, [isValid, isDirty, errors, watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime, watchedCropType, isCalculating, calculatedAmount, addEntryMutation.isPending]);


  // --- Calculation Effect ---
  useEffect(() => {
      const calculate = async () => {
           console.log("Calculate Effect: Checking conditions...");

            // Combine dates and times for validation and calculation
            const startDateTime = combineDateTime(watchedStartDate, watchedStartTime);
            const endDateTime = combineDateTime(watchedEndDate, watchedEndTime);
            const cropTypeSelected = !!watchedCropType && watchedCropType.length > 0;

            const startValid = startDateTime instanceof Date && !isNaN(startDateTime.getTime());
            const endValid = endDateTime instanceof Date && !isNaN(endDateTime.getTime());
            const timeRangeValid = startValid && endValid && endDateTime.getTime() > startDateTime.getTime();

           console.log(`Calculate Effect Details:`, {
                watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime, watchedCropType,
                startDateTime, endDateTime,
                startValid, endValid, cropTypeSelected, timeRangeValid
           });


           if (!startValid || !endValid || !cropTypeSelected || !timeRangeValid) {
                console.log("Calculate Effect: Conditions not met, clearing calculation.");
                // Only clear if it's currently set, avoid unnecessary state updates
                if (calculatedAmount !== null) {
                    setCalculatedAmount(null);
                }
                // Trigger validation to show relevant errors if needed
                 if (startValid && endValid && !timeRangeValid) {
                    trigger("endTime"); // Trigger refinement error
                 } else if ((startValid && !endValid && form.getFieldState('endTime').isDirty) || (!startValid && endValid && form.getFieldState('startTime').isDirty) ) {
                      trigger("endTime"); // Re-validate if one side is valid but other invalid/dirty
                 }
                return;
           }

            console.log("Calculate Effect: Conditions met, starting calculation...");
            setIsCalculating(true);
            setCalculatedAmount(null); // Clear previous value before new calculation
            try {
                // Pass the full Date objects to calculateCharge
                console.log(`Calculate Effect: Calling calculateCharge with startDateTime=${startDateTime}, endDateTime=${endDateTime}, crop=${watchedCropType}`);
                const amount = await calculateCharge(startDateTime, endDateTime, watchedCropType);

                console.log(`Calculate Effect: Calculation successful, amount=${amount}`);
                setCalculatedAmount(amount);

            } catch (error) {
                console.error("Charge calculation error:", error);
                 toast({
                    title: "Calculation Error",
                    description: error instanceof Error ? error.message : "Could not calculate charge.",
                    variant: "destructive"
                });
                setCalculatedAmount(null); // Reset calculation on error
            } finally {
                console.log("Calculate Effect: Finished calculation block.");
                setIsCalculating(false);
            }
      };

      // Debounce calculation slightly to avoid rapid firing
      const debounceTimer = setTimeout(calculate, 350);
      return () => clearTimeout(debounceTimer); // Cleanup timeout on unmount or re-run

  // Adjust dependencies for the effect
  }, [watchedStartDate, watchedStartTime, watchedEndDate, watchedEndTime, watchedCropType, toast, trigger, form]);


  // --- Form Submission ---
  const onSubmit = (values: EntryFormValues) => {
    console.log("onSubmit: Triggered.");
    console.log("onSubmit: Form Values:", values);
    console.log("onSubmit: Current Calculated Amount:", calculatedAmount);
    console.log("onSubmit: Is Calculating:", isCalculating);
    console.log("onSubmit: Is Form Valid:", isValid);

    // Combine date/time for validation and submission
    const startDateTime = combineDateTime(values.startDate, values.startTime);
    const endDateTime = combineDateTime(values.endDate, values.endTime);

    // Re-check validity and calculation just before submitting
    if (!isValid || !startDateTime || !endDateTime || endDateTime <= startDateTime) {
        console.error("onSubmit: Aborting submission - Form is invalid or date/time issue.");
        toast({ title: "Invalid Entry", description: "Please check the form for errors and ensure all fields are correct, and end time is after start time.", variant: "destructive" });
        trigger(); // Explicitly trigger validation to show errors
        return;
    }
     if (isCalculating) {
        console.error("onSubmit: Aborting submission - Calculation is still in progress.");
        toast({ title: "Calculation Pending", description: "Please wait for the amount calculation to complete.", variant: "destructive" });
        return;
    }
     if (calculatedAmount === null) {
        console.error("onSubmit: Aborting submission - Calculated amount is missing.");
        toast({ title: "Calculation Missing", description: "The charge amount could not be calculated. Please check times and crop type.", variant: "destructive" });
        return;
    }


    try {
       console.log("onSubmit: Preparing data for API...");
       const durationMs = endDateTime.getTime() - startDateTime.getTime();
       const durationHours = durationMs / (1000 * 60 * 60);

        const entryDataForApi = {
            customerId: values.customerId,
            // Pass the combined Date objects
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            // Keep HH:mm strings for display/reference if needed by API, otherwise redundant
            startTime: format(values.startTime, "HH:mm"),
            endTime: format(values.endTime, "HH:mm"),
            cropType: values.cropType,
            amount: calculatedAmount, // Use the state variable verified above
            durationHours: durationHours,
            isPaid: false,
        };

        console.log("onSubmit: Calling addEntryMutation.mutate with:", entryDataForApi);
        addEntryMutation.mutate(entryDataForApi);

    } catch (error) {
      console.error("onSubmit: Error preparing entry data:", error);
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred before submitting.",
        variant: "destructive",
      });
    }
  };

  // --- Loading/Error States ---
  const isLoading = isLoadingCustomers || isLoadingCropTypes;
  const isError = isErrorCustomers || isErrorCropTypes;
  const error = errorCustomers || errorCropTypes;

   if (isError) {
     return (
         <div className="flex flex-col justify-center items-center h-screen text-destructive p-6 gap-4">
           <AlertTriangle className="h-10 w-10" />
           <h2 className="text-xl font-semibold">Error Loading Data</h2>
           <p className="text-center">Could not load necessary data (customers or crop types).</p>
           <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'An unknown error occurred.'}</p>
         </div>
     );
   }


  return (
    <div className="flex justify-center items-start p-4 md:p-6">
      <Card className="w-full max-w-4xl shadow-lg rounded-lg border border-border p-4 sm:p-6 md:p-8"> {/* Adjusted max-width */}
        <CardHeader className="pb-6">
          <CardTitle className="text-xl md:text-2xl">Add New Water Supply Entry</CardTitle>
          <CardDescription>Record a new water supply session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-8"> {/* Adjusted grid layout */}

                     {/* Column 1: Customer & Crop */}
                     <div className="space-y-8 lg:col-span-1">
                        <FormField
                            control={control}
                            name="customerId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer Name</FormLabel>
                                <Select
                                     onValueChange={(value) => {
                                         field.onChange(value);
                                         trigger("customerId"); // Validate on change
                                     }}
                                     value={field.value || ""}
                                     disabled={isLoadingCustomers || addEntryMutation.isPending}
                                 >
                                <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isLoadingCustomers ? "Loading..." : "Select a customer"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {customers?.map((customer) => (
                                      <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name} - ({customer.village})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="cropType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Crop Type</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        trigger("cropType"); // Validate on change
                                    }}
                                    value={field.value || ""}
                                    disabled={isLoadingCropTypes || addEntryMutation.isPending}
                                >
                                <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isLoadingCropTypes ? "Loading..." : "Select crop type"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {cropTypes?.map((crop) => (
                                      <SelectItem key={crop} value={crop}>
                                        {crop}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     </div>


                     {/* Column 2: Start Date & Time */}
                     <div className="space-y-8 lg:col-span-1">
                         <FormField
                            control={control}
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
                                         disabled={addEntryMutation.isPending}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick start date</span>}
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                          field.onChange(date);
                                          trigger("startDate"); // Validate on change
                                          // Optionally sync endDate if startDate changes
                                          // setValue('endDate', date, { shouldValidate: true });
                                      }}
                                      disabled={(date) => date > addDays(new Date(), 1) || date < new Date("2000-01-01") || addEntryMutation.isPending} // Allow picking tomorrow
                                      initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Start Time</FormLabel>
                                    <FormControl>
                                         <TimePicker
                                            date={field.value}
                                            setDate={(date) => {
                                                field.onChange(date);
                                                trigger("startTime"); // Validate on change
                                                trigger("endTime"); // Also trigger endTime validation
                                            }}
                                            disabled={addEntryMutation.isPending}
                                         />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>

                     {/* Column 3: End Date & Time + Calculation */}
                     <div className="space-y-8 lg:col-span-1">
                         <FormField
                            control={control}
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
                                         disabled={addEntryMutation.isPending}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick end date</span>}
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={(date) => {
                                          field.onChange(date);
                                          trigger("endDate"); // Validate on change
                                          trigger("endTime"); // Also trigger endTime validation
                                      }}
                                       disabled={(date) =>
                                           date > addDays(new Date(), 2) || // Allow selection up to 2 days ahead
                                           (form.getValues("startDate") ? date < form.getValues("startDate")! : false) || // End date cannot be before start date
                                           addEntryMutation.isPending
                                       }
                                      initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="endTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>End Time</FormLabel>
                                    <FormControl>
                                         <TimePicker
                                            date={field.value}
                                             setDate={(date) => {
                                                field.onChange(date);
                                                trigger("endTime"); // Validate on change
                                             }}
                                            disabled={addEntryMutation.isPending}
                                            />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Calculated Amount Display */}
                         <div className="mt-6 h-12"> {/* Reserve space + margin top */}
                             {isCalculating ? (
                                <div className="p-3 bg-muted rounded-md text-center text-muted-foreground text-sm h-full flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating...
                                </div>
                             ) : calculatedAmount !== null ? (
                                <div className="p-3 bg-muted rounded-md text-center h-full flex items-center justify-center">
                                    <p className="text-base md:text-lg font-semibold">
                                        Calculated Amount: <span className="text-primary">{formatCurrency(calculatedAmount)}</span>
                                    </p>
                                </div>
                             ) : (
                                 <div className="p-3 text-center text-muted-foreground text-sm h-full flex items-center justify-center italic">
                                    Amount will appear here...
                                </div>
                             )}
                         </div>
                    </div>
                </div>

              {/* Submit Button - Full Width */}
              <Button
                type="submit"
                className="w-full mt-10" // Increased margin top
                disabled={
                    addEntryMutation.isPending ||
                    isCalculating ||
                    calculatedAmount === null ||
                    !isValid
                 }
               >
                 {addEntryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {addEntryMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewEntryPage;

    