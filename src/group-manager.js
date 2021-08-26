const ethers = require('ethers');  

exports.createGroup = async function(arguments) {
    
    var url = 'http://localhost:8545';
    var customHttpProvider = new ethers.providers.JsonRpcProvider(url);
    customHttpProvider.getBlockNumber().then((result) => {
        console.log("Current block number: " + result);
    });
    let wallet = new ethers.Wallet(
        // address from hardhat for now 
        "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", 
        customHttpProvider);
    

    // create fake contract instance
    address = "0x8ba1f109551bD432803012645Ac136ddd64DBA72"
    voidSigner = new ethers.VoidSigner(address, customHttpProvider)
    abi = [
        "function balanceOf(address) view returns (uint)",
        "function transfer(address, uint) returns (bool)"
    ]
    someContractAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
    contract = new ethers.Contract(someContractAddress, abi, voidSigner)

    // initialize contract
    actualContractAddress = "0x2546bcd3c84621e976d8185a91a922ae77ecec30 ";
    contract.connect(wallet);
    // contract.attach(actualContractAddress);
    console.log(await wallet.getBalance());

    console.log(arguments);

};