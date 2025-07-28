"use client";

import * as React from "react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; 
import Image from 'next/image';
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
import { Home, Users, FileText, BarChart2, Settings, LogOut, Droplets, Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

// Mock user data - replace with actual auth state if needed beyond simple password
const user = {
  name: "Yash Chaudhari",
  email: "yashchaudhari0604@gmail.com", // ✅ Chose lowercase email (consistent)
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
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
     setIsLoading(true);
     const timer = setTimeout(() => setIsLoading(false), 300);
     return () => clearTimeout(timer);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar>
        <SidebarHeader>
          <VisuallyHidden.Root>
            <h2 id="sidebar-title">Main Navigation</h2>
          </VisuallyHidden.Root>
          <div className="flex items-center gap-3 px-2 py-1">
            <Droplets className="h-8 w-8 text-white" />
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
                      isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
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
              <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/80 truncate">{user.email}</p>
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold md:text-xl flex-1">
            {navItems.find(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))?.label ?? 'Jal Seva Kendra'}
          </h1>
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

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
