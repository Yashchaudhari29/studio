
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface RecordPaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customerName: string;
    customerId: string; // Keep customerId if needed for context, but mutation happens in parent
    pendingAmount: number; // Already guaranteed to be >= 0 by parent
    onPaymentRecorded: (amount: number) => void; // Callback to trigger mutation
    isSubmitting: boolean; // Receive submitting state from parent
}

// Schema expects pendingAmount >= 0
const paymentFormSchema = (maxAmount: number) => z.object({
    amount: z.coerce // Coerce input to number
        .number({
            required_error: "Amount is required.",
            invalid_type_error: "Amount must be a number.",
        })
        .positive({ message: "Amount must be positive." }) // Ensure amount > 0
        .min(1, { message: "Amount must be at least ₹1." }) // Explicit min
        // Only apply max if maxAmount > 0
        .max(maxAmount > 0 ? maxAmount : Infinity, { // Use Infinity if no pending amount (though button will be disabled)
             message: `Amount cannot exceed pending amount of ₹${maxAmount.toFixed(0)}.`
        }),
});


const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
    isOpen,
    onClose,
    customerName,
    customerId,
    pendingAmount, // Already guaranteed >= 0
    onPaymentRecorded,
    isSubmitting, // Use prop
}) => {
    const { toast } = useToast();

    // Dynamically create schema based on pendingAmount
    const currentPaymentSchema = paymentFormSchema(pendingAmount);
    type PaymentFormValues = z.infer<typeof currentPaymentSchema>;


    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(currentPaymentSchema),
        defaultValues: {
             // Default to pending amount only if it's > 0, otherwise leave blank
             amount: pendingAmount > 0 ? pendingAmount : undefined,
        },
         mode: 'onChange', // Validate on change
    });

     // Reset form when dialog opens or relevant props change
    useEffect(() => {
        if (isOpen) {
            const defaultAmt = pendingAmount > 0 ? pendingAmount : undefined;
            console.log(`[RecordPaymentDialog] Resetting form. isOpen: ${isOpen}, pendingAmount: ${pendingAmount}, defaultAmt: ${defaultAmt}`);
            form.reset({ amount: defaultAmt });
            // Also manually clear errors that might persist
            form.clearErrors();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, pendingAmount]); // Depend on isOpen and pendingAmount


    const onSubmit = (values: PaymentFormValues) => {
        console.log("[RecordPaymentDialog] onSubmit triggered with values:", values);
        // Additional client-side check (though schema should cover this)
        if (!values.amount || values.amount <= 0 || values.amount > pendingAmount) {
            console.error("[RecordPaymentDialog] Invalid amount detected before calling parent:", values.amount);
            toast({
                title: "Invalid Amount",
                description: `Please enter a valid amount between ₹1 and ₹${pendingAmount.toFixed(0)}.`,
                variant: "destructive",
            });
            return;
        }
        // Trigger the mutation in the parent component
        onPaymentRecorded(values.amount);
        // Parent component is responsible for closing the dialog on success/error
    };

    // Handle closing the dialog
    const handleClose = () => {
         if (!isSubmitting) { // Prevent closing while submitting
             console.log("[RecordPaymentDialog] Closing dialog.");
             form.reset({ amount: undefined }); // Reset form fields on close
             form.clearErrors(); // Clear any validation errors
             onClose();
         }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
    };


    return (
        // Use onOpenChange for controlled closing
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment for {customerName}</DialogTitle>
                    <DialogDescription>
                         {pendingAmount > 0
                           ? <>Enter the amount received. Pending: <span className="font-semibold text-destructive">{formatCurrency(pendingAmount)}</span></>
                           : <span className="text-accent font-medium">No pending amount.</span>
                         }
                    </DialogDescription>
                </DialogHeader>
                 {/* Conditionally render form only if there's a pending amount */}
                 {pendingAmount > 0 ? (
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount Received (₹)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Enter amount"
                                                step="1" // Allow whole numbers
                                                min="1"
                                                max={pendingAmount} // Set max based on prop
                                                {...field}
                                                // Disable based on prop
                                                disabled={isSubmitting}
                                                // Use controlled value approach for input
                                                value={field.value ?? ''} // Use empty string if undefined
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow clearing the input or typing numbers
                                                    // Coerce to number or undefined if empty
                                                    field.onChange(value === '' ? undefined : parseFloat(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                {/* Use DialogClose for the cancel button */}
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    // Disable if submitting or form is invalid
                                    disabled={isSubmitting || !form.formState.isValid}
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {isSubmitting ? "Recording..." : "Record Payment"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                 ) : (
                     <div className="py-4 text-center text-muted-foreground">
                         No payment needed as there is no pending amount.
                          <DialogFooter className="mt-4">
                              <DialogClose asChild>
                                    <Button type="button" variant="outline">Close</Button>
                               </DialogClose>
                          </DialogFooter>
                     </div>
                 )}
            </DialogContent>
        </Dialog>
    );
};

export default RecordPaymentDialog;
