const { ethers } = require('ethers');
async function test() {
  try {
    const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-public.nodies.app");
    const nftAddress = "0xCe56eceA6BBda665255a6E5f497168F22E131cFF";
    const marketplaceAddress = "0x3CF3f566A423eBb9e6cf8a957e53AA01CB555451";
    const ownerAddress = "0x449F48A20CF8c3E9B738D9c88942a3E6bCe1aA95";
    
    const nftContract = new ethers.Contract(nftAddress, [
      "function ownerOf(uint256) view returns (address)",
      "function getApproved(uint256) view returns (address)",
      "function isApprovedForAll(address, address) view returns (bool)"
    ], provider);
    
    const marketAbi = [
      "function listToken(address nftAddress, uint256 tokenId, uint256 price) external",
      "error NotOwner()",
      "error AlreadyListed(address nftAddress, uint256 tokenId)",
      "error NotApprovedForMarketplace()",
      "error PriceMustBeAboveZero()"
    ];
    const marketContract = new ethers.Contract(marketplaceAddress, marketAbi, provider);
    
    for (let i = 1; i <= 5; i++) {
      try {
        const owner = await nftContract.ownerOf(i);
        console.log(`Token ${i} Owner:`, owner);
        if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
           try {
              await marketContract.listToken.staticCall(nftAddress, i, ethers.parseEther("0.003"), { from: ownerAddress });
              console.log(`Token ${i} CAN BE LISTED!`);
           } catch (err) {
              console.log(`Token ${i} listToken REVERTED:`, err.data || err.message);
           }
        }
      } catch (e) {
        console.log(`Token ${i} does not exist or error`);
      }
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
