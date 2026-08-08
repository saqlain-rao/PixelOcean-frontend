"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { formatEther } from "viem";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const chainId = useChainId();
  
  const [stats, setStats] = useState({ totalListings: 0, activeListings: 0, totalVolumeEth: "0" });
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
  const isAdmin = address && adminWallet && address.toLowerCase() === adminWallet.toLowerCase();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (isConnected && !isAdmin) {
      router.push("/");
    }
  }, [isConnected, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAdminData = async () => {
      try {
        setIsLoading(true);
        // Fetch stats
        const statsRes = await fetch(`${backendUrl}/api/admin/stats`, {
          headers: { "x-admin-wallet": address as string }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch all listings
        const listingsRes = await fetch(`${backendUrl}/api/admin/listings`, {
          headers: { "x-admin-wallet": address as string }
        });
        if (listingsRes.ok) {
          const listingsData = await listingsRes.json();
          setListings(listingsData);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load admin data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [isAdmin, address, backendUrl]);

  const toggleHideStatus = async (id: string, currentStatus: boolean) => {
    const toastId = toast.loading(currentStatus ? "Unhiding listing..." : "Hiding listing...");
    try {
      const res = await fetch(`${backendUrl}/api/admin/hide-listing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-wallet": address as string
        },
        body: JSON.stringify({ id, isHidden: !currentStatus })
      });

      if (!res.ok) throw new Error("Failed to update");
      
      const updatedItem = await res.json();
      
      setListings(prev => prev.map(item => item._id === id ? { ...item, isHidden: updatedItem.isHidden } : item));
      toast.success(currentStatus ? "Listing visible again!" : "Listing hidden from public!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update listing status", { id: toastId });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-xl font-bold">Please connect your wallet to access Admin Dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-xl font-bold text-destructive">Unauthorized Access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff', borderRadius: '12px' } }} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{isLoading ? "-" : stats.totalListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{isLoading ? "-" : stats.activeListings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Platform Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black">{isLoading ? "-" : `${Number(stats.totalVolumeEth).toFixed(4)} ETH/BNB`}</div>
            </CardContent>
          </Card>
        </div>

        {/* Listings Table */}
        <h2 className="text-2xl font-bold mb-6">Marketplace Data (All Networks)</h2>
        
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">Token ID</th>
                  <th className="px-6 py-4 font-bold">Network</th>
                  <th className="px-6 py-4 font-bold">Seller</th>
                  <th className="px-6 py-4 font-bold">Price</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Visibility</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading data...</td>
                  </tr>
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No listings found in database.</td>
                  </tr>
                ) : (
                  listings.map((item) => (
                    <tr key={item._id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">#{item.tokenId}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.network === 'bscTestnet' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {item.network}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{item.seller}</td>
                      <td className="px-6 py-4 font-bold">
                        {formatEther(BigInt(item.price || "0"))} {item.network === 'bscTestnet' ? 'BNB' : 'ETH'}
                      </td>
                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="text-green-500 font-semibold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span>
                        ) : (
                          <span className="text-muted-foreground font-semibold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-muted-foreground"></div> Sold/Canceled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.isHidden ? (
                          <span className="text-destructive font-semibold">Hidden</span>
                        ) : (
                          <span className="text-primary font-semibold">Public</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant={item.isHidden ? "default" : "destructive"} 
                          size="sm"
                          onClick={() => toggleHideStatus(item._id, item.isHidden)}
                          className="font-bold"
                        >
                          {item.isHidden ? "Unhide" : "Hide"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
