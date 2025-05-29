
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  BotMessageSquare,
  ListTree,
  ShieldCheck,
  BrainCircuit,
  NetworkIcon,
  Github,
  SearchCode, // Icon for ANS Resolution
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capability-negotiation", label: "Capability Negotiation", icon: BotMessageSquare },
  { href: "/agent-directory", label: "ANS Agent Registry", icon: ListTree },
  { href: "/ans-resolution", label: "ANS Resolution", icon: SearchCode },
  { href: "/secure-binding", label: "Secure Binding", icon: ShieldCheck },
  { href: "/offer-evaluation", label: "Offer Evaluation", icon: BrainCircuit },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 transition-opacity duration-300" asChild>
            <Link href="/" aria-label="Home">
              <NetworkIcon className="h-6 w-6 text-primary" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden transition-opacity duration-300">
            ANS Protocol
          </h1>
        </div>
        <div className="md:hidden ml-auto">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <Separator className="group-data-[collapsible=icon]:hidden" />
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label, className: "group-data-[collapsible=icon]:flex hidden"}}
                className={cn(
                  "justify-start",
                  pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="group-data-[collapsible=icon]:hidden"/>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" asChild>
          <a href="https://github.com/firebase/studio" target="_blank" rel="noopener noreferrer">
            <Github className="h-5 w-5" />
            <span className="ml-2 group-data-[collapsible=icon]:hidden">GitHub</span>
          </a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
