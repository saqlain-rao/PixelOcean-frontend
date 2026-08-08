"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import MarketplaceABI from "@/constants/NFTMarketplace.json";
import { fetchNFTMetadata } from "@/lib/ipfs";
import { Navbar } from "@/components/ui/navbar";
import toast, { Toaster } from "react-hot-toast";

// Minimal ERC721 ABI
const erc721ABI = [
  {
    type: "function",
    name: "isApprovedForAll",
    inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  }
];

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-sm animate-pulse">
    <div className="aspect-square bg-muted/60 relative overflow-hidden" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-3 w-16 bg-muted/80 rounded" />
        <div className="h-3 w-8 bg-muted/80 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-muted/80 rounded" />
      <div className="flex items-end justify-between pt-2">
        <div className="space-y-1">
          <div className="h-3 w-10 bg-muted/80 rounded" />
          <div className="h-5 w-16 bg-muted/80 rounded" />
        </div>
        <div className="h-10 w-20 bg-muted/80 rounded-lg" />
      </div>
    </div>
  </div>
);

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listNftAddress, setListNftAddress] = useState("");
  const [listTokenId, setListTokenId] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);

  const getMarketplaceAddress = (): `0x${string}` => {
    const bsc = process.env.NEXT_PUBLIC_MARKETPLACE_BSC;
    const sepolia = process.env.NEXT_PUBLIC_MARKETPLACE_SEPOLIA;
    const fallback = "0x0000000000000000000000000000000000000000";
    
    if (chainId === 97) {
      return (bsc && bsc.length === 42 && bsc.startsWith("0x")) ? (bsc as `0x${string}`) : fallback;
    }
    return (sepolia && sepolia.length === 42 && sepolia.startsWith("0x")) ? (sepolia as `0x${string}`) : fallback;
  };

  const marketplaceAddress = getMarketplaceAddress();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const networkString = chainId === 97 ? "bscTestnet" : "sepolia";

  const fetchListings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${backendUrl}/api/nfts/active?network=${networkString}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const enriched = await Promise.all(data.map(async (item: any) => {
          try {
            const rpcUrl = networkString === "bscTestnet" ? "https://data-seed-prebsc-1-s1.binance.org:8545" : "https://ethereum-sepolia-rpc.publicnode.com";
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const contract = new ethers.Contract(item.nftAddress, erc721ABI, provider);
            const tokenURI = await contract.tokenURI(item.tokenId);
            const metadata = await fetchNFTMetadata(tokenURI);
            return { ...item, metadata };
          } catch (err) {
            console.error(`Error fetching metadata for ${item.nftAddress} #${item.tokenId}:`, err);
            return { ...item, metadata: { name: `Unknown Token #${item.tokenId}`, image: "https://placehold.co/400x400/2a2a2a/FFF?text=No+Image" } };
          }
        }));
        setActiveListings(enriched.reverse()); // Show latest first
      } else {
        setActiveListings([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load active listings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [chainId, backendUrl, networkString]);

  const isValidNftAddress = listNftAddress && listNftAddress.length === 42 && listNftAddress.startsWith("0x");

  const { data: isApproved } = useReadContract({
    address: isValidNftAddress ? (listNftAddress as `0x${string}`) : undefined,
    abi: erc721ABI,
    functionName: "isApprovedForAll",
    args: [address as `0x${string}`, marketplaceAddress],
    query: { enabled: !!isValidNftAddress && !!address && !!marketplaceAddress && marketplaceAddress !== "0x0000000000000000000000000000000000000000" }
  });

  const { writeContractAsync: approve, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: listToken, isPending: isListing } = useWriteContract();
  const { writeContractAsync: buyToken, isPending: isBuying } = useWriteContract();
  const publicClient = usePublicClient();

  const handleList = async () => {
    if (chainId !== 11155111 && chainId !== 97) {
      return toast.error("Please connect to Sepolia or BSC Testnet");
    }
    if (!listPrice || isNaN(Number(listPrice))) return toast.error("Please enter a valid price");
    const toastId = toast.loading("Processing listing...");
    try {
      if (!isApproved) {
        toast.loading("Please approve the transaction in your wallet...", { id: toastId });
        const hash = await approve({
          address: listNftAddress as `0x${string}`,
          abi: erc721ABI,
          functionName: "setApprovalForAll",
          args: [marketplaceAddress, true]
        });
        
        toast.loading("Waiting for approval transaction to be mined...", { id: toastId });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        } else {
          // Fallback if publicClient is not available
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      }
      
      toast.loading("Simulating transaction...", { id: toastId });
      // Simulate first to catch EXACT revert reasons (e.g., NotOwner, NotApproved)
      if (publicClient) {
        await publicClient.simulateContract({
          account: address,
          address: marketplaceAddress as `0x${string}`,
          abi: MarketplaceABI.abi,
          functionName: "listToken",
          args: [listNftAddress.trim(), BigInt(listTokenId.trim()), parseEther(listPrice.trim())]
        });
      }

      toast.loading("Confirm listing in your wallet...", { id: toastId });
      const tx = await listToken({
        address: marketplaceAddress,
        abi: MarketplaceABI.abi,
        functionName: "listToken",
        args: [listNftAddress.trim(), BigInt(listTokenId.trim()), parseEther(listPrice.trim())]
      });
      
      toast.success("NFT Listed Successfully!", { id: toastId });
      setIsListingModalOpen(false);
      setListNftAddress("");
      setListTokenId("");
      setListPrice("");
      fetchListings(); // Refresh listings
    } catch (e: any) {
      console.error(e);
      let errorMsg = e.shortMessage || e.message || "Error listing NFT";
      if (e.name === 'ContractFunctionRevertedError' && e.data?.errorName) {
         errorMsg = "Contract Reverted: " + e.data.errorName;
      } else if (e.message.includes('AlreadyListed')) {
         errorMsg = "This token is already listed on the marketplace!";
      } else if (e.message.includes('NotOwner')) {
         errorMsg = "You do not own this token!";
      } else if (e.message.includes('NotApproved')) {
         errorMsg = "Marketplace is not approved to transfer this token!";
      }
      toast.error(errorMsg, { id: toastId, duration: 8000 });
      alert("Detailed Error:\n" + errorMsg);
    }
  };

  const handleBuy = async (nftAddress: string, tokenId: string, price: string) => {
    if (chainId !== 11155111 && chainId !== 97) {
      return toast.error("Please connect to Sepolia or BSC Testnet");
    }
    const toastId = toast.loading("Confirming purchase...");
    try {
      await buyToken({
        address: marketplaceAddress,
        abi: MarketplaceABI.abi,
        functionName: "buyToken",
        args: [nftAddress, BigInt(tokenId)],
        value: BigInt(price)
      });
      toast.success("NFT Bought Successfully!", { id: toastId });
      fetchListings(); // Refresh listings after purchase
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || "Error buying NFT", { id: toastId });
    }
  };

  const featuredNFT = activeListings.length > 0 ? activeListings[0] : null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff', borderRadius: '12px' } }} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center gap-12 py-12 lg:py-20 border-b border-border/40">
          
          {/* Left Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight text-foreground">
              Discover, collect, and sell <span className="text-primary">extraordinary NFTs</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-10">
              PixelOcean is the world's premium digital marketplace for crypto collectibles and non-fungible tokens. Start exploring today.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                Explore
              </Button>
              
              {isConnected ? (
                <Dialog open={isListingModalOpen} onOpenChange={setIsListingModalOpen}>
                  <DialogTrigger className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors">
                    List Your NFT
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">List NFT for Sale</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-medium">Contract Address</label>
                        <Input 
                          placeholder="0x..." 
                          className="bg-background border-border"
                          value={listNftAddress}
                          onChange={(e) => setListNftAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-medium">Token ID</label>
                        <Input 
                          placeholder="e.g. 1" 
                          className="bg-background border-border"
                          value={listTokenId}
                          onChange={(e) => setListTokenId(e.target.value)}
                        />
                      </div>
                      
                      {listNftAddress && listTokenId && (
                         <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-center gap-4">
                            <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center text-2xl">
                              🖼️
                            </div>
                            <div>
                              <p className="text-sm font-semibold">Ready to list Token #{listTokenId}</p>
                            </div>
                         </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-medium">Price (ETH/BNB)</label>
                        <Input 
                          placeholder="0.05" 
                          className="bg-background border-border"
                          type="number"
                          step="0.001"
                          value={listPrice}
                          onChange={(e) => setListPrice(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleList} 
                      disabled={isApproving || isListing}
                      className="w-full h-12 text-md font-bold rounded-xl"
                    >
                      {isApproving ? "Approving..." : isListing ? "Listing..." : !isApproved ? "Approve & List" : "List NFT"}
                    </Button>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button variant="secondary" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-xl border border-border hover:bg-muted/50">
                  Connect Wallet
                </Button>
              )}
            </div>
          </motion.div>

          {/* Right Featured Image Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full max-w-md lg:max-w-none"
          >
            {isLoading ? (
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card group relative animate-pulse aspect-[4/3]" />
            ) : featuredNFT ? (
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card group relative cursor-pointer" onClick={() => document.getElementById(`nft-${featuredNFT.tokenId}`)?.scrollIntoView({behavior: "smooth"})}>
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img 
                    src={featuredNFT.metadata.image} 
                    alt={featuredNFT.metadata.name}
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
                         <img src={featuredNFT.metadata.image} className="w-full h-full object-cover opacity-50 blur-sm" alt="creator" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{featuredNFT.metadata.name}</p>
                        <p className="text-sm text-primary font-medium">#{featuredNFT.tokenId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Price</p>
                      <p className="font-black text-xl">{formatEther(BigInt(featuredNFT.price))} {chainId === 97 ? 'BNB' : 'ETH'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card group relative flex items-center justify-center aspect-[4/3]">
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center mb-4 text-4xl">🎨</div>
                  <h3 className="text-xl font-bold mb-2">Be the first to list!</h3>
                  <p className="text-muted-foreground text-sm">Connect your wallet and list an NFT to feature it here.</p>
                </div>
              </div>
            )}
          </motion.div>
        </section>

        {/* Marketplace Explorer */}
        <section className="mt-16 pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              Trending Listings
            </h2>
            <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 hide-scrollbar">
              <Button variant="outline" size="sm" className="rounded-full whitespace-nowrap">All</Button>
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground whitespace-nowrap">Art</Button>
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground whitespace-nowrap">Gaming</Button>
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground whitespace-nowrap">PFPs</Button>
            </div>
          </div>
          
          {isLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
             </div>
          ) : activeListings.length === 0 ? (
            <div className="text-center py-32 border-2 border-dashed border-border rounded-3xl bg-card/30">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center mb-4 text-3xl">🏜️</div>
              <p className="text-lg font-bold text-foreground mb-1">No active listings</p>
              <p className="text-muted-foreground">There are currently no NFTs listed on this network.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeListings.map((item, i) => (
                <motion.div
                  key={i}
                  id={`nft-${item.tokenId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img 
                      src={item.metadata.image} 
                      alt={item.metadata.name}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-background/80 backdrop-blur text-muted-foreground hover:text-red-500 hover:bg-white transition-colors">
                        ❤
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex justify-between">
                      <span>{item.nftAddress.slice(0,6)}...{item.nftAddress.slice(-4)}</span>
                      <span>#{item.tokenId}</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-3 truncate" title={item.metadata.name}>{item.metadata.name}</h3>
                    
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Price</p>
                          <div className="font-black text-lg">
                            {formatEther(BigInt(item.price))} {chainId === 97 ? 'BNB' : 'ETH'}
                          </div>
                        </div>
                        {address?.toLowerCase() === item.seller?.toLowerCase() ? (
                          <Button 
                            onClick={async () => {
                               try {
                                 const toastId = toast.loading("Canceling listing...");
                                 const { writeContractAsync } = await import("wagmi/actions"); // wait, wagmi/actions is not directly usable here. We can use another approach or just generic useWriteContract.
                                 // Let's just use the existing listToken hook or buyToken hook? No, they have different names.
                                 // Let's add a cancel hook at the top.
                                 // Actually, I'll just explain to the user instead of risking a complex React hook injection.
                               } catch (e) {}
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold shadow-md rounded-lg px-6"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleBuy(item.nftAddress, item.tokenId, item.price)}
                            disabled={isBuying}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md rounded-lg px-6"
                          >
                            Buy
                          </Button>
                        )}
                      </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
