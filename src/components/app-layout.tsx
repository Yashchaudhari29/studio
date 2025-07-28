
"use client";

import * as React from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import Image from 'next/image'; // Using next/image for potential optimization
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarMenuSkeleton
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home, Users, FileText, BarChart2, Settings, LogOut, Droplets, Loader2 } from "lucide-react"; // Added Loader2
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"; // Assuming Avatar component exists
import { useAuth } from "@/hooks/use-auth"; // Import useAuth hook
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"; // Import VisuallyHidden

// Mock user data - replace with actual auth state if needed beyond simple password
const user = {
  name: "Yash Chaudhari",
<<<<<<< HEAD
  email: "yashchaudhari0604@gmail.com",
=======
  email: "Yashchaudhari0604@gmail.com",
>>>>>>> c7343aa (Make the following changes:)
  avatarUrl: "" // Optional: Add URL if available https://picsum.photos/40/40
};

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/entries", label: "Entries", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart2 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter(); // Use router for navigation
  const [isLoading, setIsLoading] = React.useState(false); // Use local loading state for sidebar skeleton if needed
  const [isLoggingOut, setIsLoggingOut] = React.useState(false); // State for logout button

  // Moved this hook call before conditional returns to fix hook order violation
  // Simulate loading delay for sidebar skeleton (remove in production if not needed)
  React.useEffect(() => {
     setIsLoading(true);
     const timer = setTimeout(() => setIsLoading(false), 300); // Shorter delay
     return () => clearTimeout(timer);
  }, []);


   // Prevent rendering layout if not authenticated or still loading auth state
   // This assumes the AuthProvider handles the initial loading state (isAuthenticated === null)
   if (isAuthenticated === null) {
     // Optionally show a global loading spinner here instead of inside the sidebar
     return (
       <div className="flex justify-center items-center min-h-screen">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }

  // If not authenticated and not on login page, AuthProvider should redirect, but double-check here
  if (!isAuthenticated && pathname !== '/login') {
    // Typically handled by AuthProvider, but added as a safety net
    return null; // Or redirect, though AuthProvider should handle this
  }

  // Don't render the AppLayout on the login page itself
  if (pathname === '/login') {
    return <>{children}</>;
  }


  const handleLogout = async () => {
      setIsLoggingOut(true);
      // Perform logout logic (clear session, call context logout)
      await logout(); // Call the logout function from context
      // AuthProvider handles the redirect to /login
      setIsLoggingOut(false);
  };

  // Only render the sidebar layout if authenticated
  if (!isAuthenticated) {
      // This case should ideally be handled by the redirect logic in AuthProvider
      return null; // Or a loading indicator if waiting for redirect
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader>
           {/* Add hidden title for accessibility */}
            <VisuallyHidden.Root>
                <h2 id="sidebar-title">Main Navigation</h2>
            </VisuallyHidden.Root>
           <div className="flex items-center gap-3 px-2 py-1">
             <Droplets className="h-8 w-8 text-white" /> {/* Simple logo */}
             <h1 className="text-xl font-semibold text-sidebar-foreground">Jal Seva Kendra</h1>
           </div>
           <Separator className="my-2 bg-sidebar-border/50" />
        </SidebarHeader>

        <SidebarContent className="p-2">
           <SidebarMenu>
            {isLoading ? (
               <>
                 <SidebarMenuSkeleton showIcon={true} />
                 <SidebarMenuSkeleton showIcon={true} />
                 <SidebarMenuSkeleton showIcon={true} />
                 <SidebarMenuSkeleton showIcon={true} />
               </>
            ) : (
              navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))} // Handle nested routes
                        tooltip={item.label}
                    >
                       <a>
                        <item.icon />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))
            )}
           </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t border-sidebar-border/50">
          {isLoading ? (
             <div className="flex items-center gap-3 p-2">
               <SidebarMenuSkeleton className="h-8 w-full" />
             </div>
          ) : (
             <div className="flex items-center gap-3 p-2">
                 {/* User Info - Align text left */}
                 <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden"> {/* Removed text-center */}
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                    <p className="text-xs text-sidebar-foreground/80 truncate">{user.email}</p>
                 </div>
             </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top bar with trigger */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
          <SidebarTrigger className="md:hidden" /> {/* Show trigger only on mobile */}
           <h1 className="text-lg font-semibold md:text-xl flex-1">
               {/* Dynamically set title based on route */}
               {navItems.find(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))?.label ?? 'Jal Seva Kendra'}
           </h1>
           {/* Add other header elements if needed */}
            {/* Logout Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Logout"
            >
                {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
