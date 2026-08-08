const { ethers } = require('ethers');
async function simulate() {
  try {
    const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-public.nodies.app");
    
    // 1. Get Owner of Token ID 2
    const nftAddress = "0xCe56eceA6BBda665255a6E5f497168F22E131cFF";
    const nftContract = new ethers.Contract(nftAddress, ["function ownerOf(uint256) view returns (address)", "function getApproved(uint256) view returns (address)", "function isApprovedForAll(address, address) view returns (bool)"], provider);
    
    const owner = await nftContract.ownerOf(2);
    console.log("Owner of Token 2:", owner);
    
    const marketplaceAddress = "0x3CF3f566A423eBb9e6cf8a957e53AA01CB555451";
    
    // 2. Check approvals
    const approved = await nftContract.getApproved(2);
    console.log("Approved for Token 2:", approved);
    const isApprovedAll = await nftContract.isApprovedForAll(owner, marketplaceAddress);
    console.log("Is Marketplace Approved for All:", isApprovedAll);
    
    // 3. Simulate listToken from the owner
    const marketplaceAbi = [
      "function listToken(address nftAddress, uint256 tokenId, uint256 price) external",
      "error NotOwner()",
      "error AlreadyListed(address nftAddress, uint256 tokenId)",
      "error NotApprovedForMarketplace()",
      "error PriceMustBeAboveZero()"
    ];
    
    const marketContract = new ethers.Contract(marketplaceAddress, marketplaceAbi, provider);
    
    console.log("Simulating listToken...");
    
    const tx = await marketContract.listToken.staticCall(nftAddress, 2, ethers.parseEther("0.003"), { from: owner });
    console.log("Simulation SUCCESS! Returned:", tx);
    
  } catch (e) {
    console.log("Simulation FAILED!");
    console.log("Error name:", e.name);
    console.log("Error code:", e.code);
    console.log("Error revert data:", e.data);
    console.log("Error message:", e.message);
  }
}
simulate();
