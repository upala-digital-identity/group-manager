const ethers = require('ethers');

const poolFactoryAbi = [
    "function balanceOf(address) view returns (uint)",
    "function transfer(address, uint) returns (bool)"
]
address = "0x01Ca8A0BA4a80d12A8fb6e3655688f57b16608cf"
const voidSigner = new ethers.VoidSigner(address, customHttpProvider)

var url = 'http://localhost:8545';
var customHttpProvider = new ethers.providers.JsonRpcProvider(url);
customHttpProvider.getBlockNumber().then((result) => {
    // console.log("Current block number: " + result);
});
let wallet = new ethers.Wallet(
    // address from hardhat for now 
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", 
    customHttpProvider);

// Interacting with smart contracts
class PoolFactory {
    constructor(wallet, upalaConstants) {
        this.wallet = wallet;
        this.upalaConstants = upalaConstants;
        this.gasPrice = "";
        this.pool; // hm.. smart contract should be available here
      }
    
    deploy() { 
        // return initialized pool contract
    }

    attach(address) {
        // return initialised pool contract
    }
}

class Graph {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    // "is this bundleHash deleted"
    // "what is the current base score for the pool address"
}

class DB {
    constructor(endpoint) {}
    publishBundle(bundle){}

}

class Bundle {
    constructor(wallet, workdir) {
        this.state = "" // "" -> hash -> chain -> signed -> live
        this.readWorkDir()
        this.bundle = ""  // json with all fields
    }
    readWorkDir() {
        // You've got bundles that are not finalized
    }
    newBundle(csv) {
    }

    nextStep() {
        // hash: check csv // create hash
        // chain: publish hash on-chain      <--- append task starts here
        // signed: sign scores with 
        // live: pushed to db
    }
    
    publish(csv) {
        let bundle = Bundle.newBundle(csv)
        this.pool.publishBundle(bundle)
        DB.publishBundle(bundle)
    }

    append(csv, existingBundleID) {
        let bundle = new Bundle(csv)
        DB.publishBundle(bundle)
    }
}

class PoolManager {
    constructor(wallet, upalaConstants, poolAddress, workdir){
        if (poolAddress) {
            this.pool = PoolFactory.attach() 
        }
        else {
            this.pool = PoolFactory.deploy()
        }        
    }
    
    publishBundle(csv) {
        Bundle.newBundle()
    }
    appendToBundle(csv, existingBundleID) {
        Bundle.append(csv, existingBundleID)
    }
    // if something went wrong during prevoius task
    finalizeBundle() {
        Bundle.finalize()
    }


    // Contract functions
    setBaseScore(newScore) {
    }
    setGasPrice(){
    }
    commit(){}

}

// bind to existing group
exports.attachToGroup = async function(poolContractAddress) {
    contract = new ethers.Contract(poolContractAddress, poolFactoryAbi, voidSigner)
    return contract
}

// or create new group
exports.createGroup = async function(arguments) {
    
    someContractAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
    contract = new ethers.Contract(someContractAddress, poolFactoryAbi, voidSigner)

    // initialize contract
    actualContractAddress = "0x2546bcd3c84621e976d8185a91a922ae77ecec30 ";
    contract.connect(wallet);
    // contract.attach(actualContractAddress);
    console.log(await wallet.getBalance());
    console.log("sdf");
};

