"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Search, ShoppingCart, User, Menu } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { useAccount } from "wagmi";
import Link from "next/link";

export function Navbar() {
  const { address } = useAccount();
  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
  const isAdmin = address && adminWallet && address.toLowerCase() === adminWallet.toLowerCase();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-md transition-transform group-hover:scale-105">
              P
            </div>
            <span className="hidden sm:inline-block font-black text-xl tracking-tight text-foreground">
              PixelOcean
            </span>
          </div>
        </Link>

        {/* Search Bar (Centered, visible on md+) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8 items-center">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search size={18} />
            </div>
            <Input 
              type="text" 
              placeholder="Search items, collections, and accounts" 
              className="pl-10 h-10 w-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-transparent transition-all rounded-xl"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-md border border-border">/</span>
            </div>
          </div>
        </div>

        {/* Navigation Links & Connect */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-6 mr-4 text-sm font-semibold text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Explore</a>
            <a href="#" className="hover:text-foreground transition-colors">Drops</a>
            <a href="#" className="hover:text-foreground transition-colors">Stats</a>
            <a href="#" className="hover:text-foreground transition-colors">Create</a>
            {isAdmin && (
              <Link href="/admin" className="text-primary hover:text-primary/80 transition-colors font-bold flex items-center gap-1">
                Admin 🛡️
              </Link>
            )}
          </div>
          
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50 rounded-xl hidden xl:flex">
              <ShoppingCart size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50 rounded-xl hidden xl:flex">
              <User size={20} />
            </Button>
          </div>

          <ConnectButton showBalance={false} />

          <Button variant="ghost" size="icon" className="md:hidden text-foreground">
            <Menu size={24} />
          </Button>
        </div>

      </div>
    </nav>
  );
}
