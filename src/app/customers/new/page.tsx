
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { addCustomer } from '@/lib/api/customers'; // Use the updated API function
import { Loader2 } from 'lucide-react';

const customerFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).trim(),
  mobile: z.string().regex(/^\d{10}$/, { message: "Mobile number must be 10 digits." }).trim(),
  village: z.string().min(2, { message: "Village name must be at least 2 characters." }).trim(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const NewCustomerPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Get query client instance

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      mobile: "",
      village: "",
    },
    mode: 'onChange', // Validate on change for better UX
  });

  // Mutation for adding a customer
  const addCustomerMutation = useMutation({
    mutationFn: addCustomer, // The API function to call
    onSuccess: (newCustomerId, variables) => {
      console.log("Successfully added customer with ID:", newCustomerId);
      toast({
        title: "Customer Added",
        description: `${variables.name} has been successfully added.`,
        variant: "default", // Use default (often green/positive) for success
      });
      // Invalidate the customers query cache to refetch the list on the customers page
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      router.push('/customers'); // Redirect back to customer list
    },
    onError: (error) => {
      console.error("Failed to add customer:", error);
      toast({
        title: "Error Adding Customer", // More specific title
        description: error instanceof Error ? error.message : "Could not add customer. Please check the details and try again.", // Provide more helpful message
        variant: "destructive",
      });
    },
    // Optional: onSettled can be used for cleanup regardless of success/failure
    // onSettled: () => {
    //   console.log("Add customer mutation finished.");
    // }
  });

  const onSubmit = (values: CustomerFormValues) => {
    console.log("Submitting customer data:", values);
    // Trim values before submitting
    const trimmedValues = {
        name: values.name.trim(),
        mobile: values.mobile.trim(),
        village: values.village.trim(),
    };
    addCustomerMutation.mutate(trimmedValues); // Execute the mutation with trimmed values
  };

  return (
    <div className="flex justify-center items-start p-4 md:p-6">
      <Card className="w-full max-w-lg shadow-lg rounded-lg border border-border"> {/* Added border */}
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Add New Customer</CardTitle> {/* Responsive title size */}
          <CardDescription>Enter the details for the new customer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} disabled={addCustomerMutation.isPending} aria-required="true"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter 10-digit mobile number" {...field} disabled={addCustomerMutation.isPending} aria-required="true"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="village"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Village</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter village name" {...field} disabled={addCustomerMutation.isPending} aria-required="true"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                 type="submit"
                 className="w-full mt-8" // Added margin top
                 // Disable button if mutation is pending OR if the form is invalid
                 disabled={addCustomerMutation.isPending || !form.formState.isValid}
              >
                {addCustomerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {addCustomerMutation.isPending ? "Saving Customer..." : "Save Customer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCustomerPage;
