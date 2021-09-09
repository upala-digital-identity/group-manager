const ethers = require('ethers');
const { isReturnStatement } = require('typescript');

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

class ScoreExplorer {
    constructor(endpoint) {}
    publishBundle(bundle){}

}

class LocalDB {
    // Moves csv file through the following folders (or similar)
    // csvs -> signed -> db -> live
    // if any file is under this procedure, do nothing
    // score bundles are named using date and user 
    // proposed name 2021-08-22-meta-game-friends
    constructor(endpoint) {
        // endpoint is an object 
        // if workdir, save to files (also connect with tests this way)
        // if endpoint and access credentials then attach to DB
    }
    save(data) {
        // save data in the right place depending on fields
        // if dbTransaction then live
    }

    getUnprocessedCSV() {
        // return unprocessed csv
    }
}

class Bundle {
    constructor(initiatedPool, localDB, scoreExplorer) {
        this.initiatedPool = initiatedPool
        this.localDB = localDB
        this.scoreExplorer = scoreExplorer

        this.json = this.localDB.getUnprocessedCSV()
    }

    // if queue is clean new score bundle can be created
    publishNew(csv) {
        // check
        this._requireCleanQueue()
        this._requireValidCSV(csv)
        
        // process
        this.csv = csv
        this.process()
    }

    // if queue is clean scores can be appended to an existing bundle 
    // Append is available for signed scores pool only
    append(csv, bundleID) {
        // todo check if this is Signed scores pool
        this._requireCleanQueue()
        this._requireValidCSV(csv)
        this._requireActiveBundleID(bundleID)

        // process
        this.csv = csv
        this.bundleID = bundleID
        this.ethTx = "ok"
        this.ethTxMined = true
        this.process()
    }

    // if there's an unprocessed bundle, this function should be called
    // new -> ☑️ bundleID -> ☑️ chain -> ☑️ signed -> ☑️ live
    process() {
        // check
        _requireCSV()

        // process
        !(this.bundleID) ? this._calcBundleId() : {}
        !(this.ethTx) ? this._pushToChain() : {}
        !(this.ethTxMined) ? this._waitTx() : {}
        !(this.dbTransaction) ? this._pushToRemoteDb() : {}
    }

    _requireCSV() {
        if (!this.csv) { throw "No CSV loaded. Publish or append csv first" }
        return true
    }

    _requireCleanQueue() {
        if (this.csv) { throw "Got CSV processing. Finish processing first" }
        return true
    }

    _requireValidCSV(csv) {
        // is csv valid
        return true
    }

    _requireActiveBundleID(bundleID) {
        // is it already onChain? graph
        return true
    }

    _calcBundleId() {
        this.bundleID = "dsf" // hash bundle data to get ID
        this.localDB.save(this._exportJSON())
    }

    _pushToChain() {
        // is it already onChain? graph
        this.ethTx = this.pool.publishBundle(bundle)
        this.localDB.save(this._exportJSON())
    }

    _waitTx() {
        this.ethTx.wait(2)
        this.ethTxMined = true
        this.localDB.save(this._exportJSON())
    }

    _pushToRemoteDb() {
        this.dbTransaction = this.scoreExplorer.publishBundle(bundle)
        this.localDB.save(this._exportJSON())
    }

}

class Pool {
    constructor(wallet, upalaConstants, poolAddress, localDB){
        if (poolAddress) {
            this.pool = PoolFactory.attach() 
        }
    }

    deploy() {
        this.pool = PoolFactory.deploy()
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

