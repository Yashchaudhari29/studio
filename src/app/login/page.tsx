"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from 'react';
import { verifyPassword } from '@/actions/auth'; // Server action
import { useAuth } from '@/hooks/use-auth'; // Auth context hook
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from 'lucide-react';

const loginFormSchema = z.object({
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      password: "",
    },
    mode: 'onChange',
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const isAuthenticated = await verifyPassword(values.password);
      if (isAuthenticated) {
        login(); // Update auth state via context
        toast({ title: "Login Successful", description: "Redirecting...", variant: "default" });
        router.push('/'); // Redirect to dashboard or desired page
      } else {
        toast({
          title: "Login Failed",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
        form.resetField("password"); // Clear password field on failure
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm shadow-lg border border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            Jal Seva Login
          </CardTitle>
          <CardDescription>Enter the password to access the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        {...field}
                        disabled={isSubmitting}
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Verifying..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
        {/* Optional: Add a footer if needed */}
         {/* <CardFooter className="text-center text-xs text-muted-foreground pt-4">
           Protected access area.
         </CardFooter> */}
      </Card>
    </div>
  );
};

export default LoginPage;
