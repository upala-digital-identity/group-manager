const upalaConstants = require('upala-constants')
const ethers = require('ethers');

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
    // csvs -> unprocessed (valid_csv, receipt) -> live
    // if any file is under this procedure, do nothing
    // score bundles are named using date and user 
    // proposed name 2021-08-22-meta-game-friends
    constructor(endpoint) {
        // endpoint is an object 
        // if workdir, save to files (also connect with tests this way)
        // if endpoint and access credentials then attach to DB
    }

    updateSubBundle(subBundle) {
        // if !dbTransaction then live
        // save both csv and receipt to unprocessed folder
        // if dbTransaction
        // save 
        return subBundle
    }

    getUnprocessedSubBundle() {
        // if dbTransaction then live
        if (!subBundle.dbTransaction) {
            // return unprocessed csv
        }
        return {}
    }

    getActiveBundlesList(){

    }
}

class PoolManager {
    // args: 
    // wallet 
    // upalaConstants
    // localDbEndpoint
    // scoreExplorerEndpoint
    // overrideAddresses

    constructor(args) {
        // DBs
        this.localDB = new LocalDB(args.localDbEndpoint)
        this.scoreExplorer = new ScoreExplorer(args.scoreExplorerEndpoint)

        // State
        this.subBundle = this.localDB.getUnprocessedSubBundle()
        
        // Wallet
        this.wallet = args.wallet

        // Overrides
        this.addresses = args.overrideAddresses

    }

    /*********
    INITIALIZE
    **********/

    async initializeUpalaContracts(poolType) {
        if (!this.abis) {
            this.abis = upalaConstants.getAbis()
        }
        if (!this.addresses) {
            this.addresses = upalaConstants.getAddresses({chainID: await this.wallet.getChainId()})
        }
        if (!this.upala) {
            this.upala = new ethers.Contract(
                this.addresses.Upala,
                this.abis.Upala, 
                this.wallet)
        }
        if (!this.poolFactoryTemp) {
            let poolFactoryType = poolType + 'Factory'
            this.poolFactoryTemp = new ethers.Contract(
                this.addresses[poolFactoryType], 
                this.abis[poolFactoryType], 
                this.wallet)
        }
    }

    async attachToPool(poolType, poolAddress) {
        if (this.pool) {
            return this.pool
        } else {
            await this.initializeUpalaContracts(poolType)
            const poolContract = new ethers.Contract(
            poolAddress, 
            this.abis[poolType], 
            this.wallet)
            this.pool = poolContract
            return poolContract
        }
    }

    async deployPool(poolType) {
        await this.initializeUpalaContracts(poolType)
        const tx = await this.poolFactoryTemp.connect(this.wallet).createPool()
        const blockNumber = (await tx.wait(1)).blockNumber
        const eventFilter = this.upala.filters.NewPool();
        const events = await this.upala.queryFilter(eventFilter, blockNumber, blockNumber);
        const newPoolAddress = events[0].args.poolAddress
        return this.attachToPool(poolType, newPoolAddress)
    }

    /*************
    MANAGE SCORES
    *************/

    // if queue is clean new score bundle can be created
    publishNew(csv) {
        // check
        this._requireCleanQueue()
        this._requireValidCSV(csv)
        
        // process
        this.subBundle.csv = csv
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
        this.subBundle.csv = csv
        this.subBundle.bundleID = bundleID
        this.subBundle.ethTx = "ok"
        this.subBundle.ethTxMined = true
        this.process()
    }

    // if there's an unprocessed bundle, this function should be called
    // new -> ☑️ bundleID -> ☑️ chain -> ☑️ signed -> ☑️ live
    process() {
        // check
        _requireCSV()

        // process
        try {
            !(this.subBundle.bundleID) ? this._assignBundleId() : {}
            !(this.subBundle.subBundleID) ? this._assignSubBundleId() : {}
            !(this.subBundle.ethTx) ? this._pushToChain() : {}
            !(this.subBundle.ethTxMined) ? this._waitTx() : {}
            !(this.subBundle.dbTransaction) ? this._pushToRemoteDb() : {}
        } catch ( error ) {
            throw( error );
        } finally {
            this.localDB.updateSubBundle(this.subBundle)
        }
    }

    getActiveBundlesList() {
        return this.localDB.getActiveBundlesList()
    }

    async deleteScoreBundleId(scoreBundleId) {
        this.pool.deleteScoreBundleId(scoreBundleId)
    }

    getBaseScore() {
        return this.pool.baseScore()
    }

    setBaseScore(newScore) {
        this.pool.setBaseScore(newScore)
    }

    /***********
    MANAGE OTHER
    ************/

    // withdrawFromPool(address recipient, uint256 amount) 
    
    // updateMetadata(string calldata newMetadata)

    /*******
    INTERNAL
    ********/    

    _requireCSV() {
        if (!this.subBundle.csv) { throw "No CSV loaded. Publish or append csv first" }
        return true
    }

    _requireCleanQueue() {
        if (this.subBundle.csv) { throw "Got CSV processing. Finish processing first" }
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

    _assignBundleId() {
        this.subBundle.bundleID = "dsf" // hash bundle data to get ID
    }

    // as Signed Scores Pool may have multiple subBundles within single bundle
    // every subBundle is assigned a uniqe ID. Calculated the same way as 
    // Bundle ID. The first subBundleID equals its Bundle ID
    _assignSubBundleId() {
        this.subBundle.subBundleID = "dsf" // hash bundle data to get ID
    }

    _pushToChain() {
        // is it already onChain? graph
        this.subBundle.ethTx = this.pool.publishBundle(bundle)
    }

    _waitTx() {
        this.subBundle.ethTx.wait(2)
        this.subBundle.ethTxMined = true
    }

    _pushToRemoteDb() {
        this.subBundle.dbTransaction = this.scoreExplorer.publishBundle(bundle)
    }
}

async function main() {
    
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
    const mnemonic = "test test test test test test test test test test test junk"
    const poolManagerWallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider)
    
    const poolManager = new PoolManager({
        wallet: poolManagerWallet
      })
    // const poolContract = await poolManager.deployPool('SignedScoresPool')
    const poolContract = await poolManager.attachToPool('SignedScoresPool', '0x9b438758098003c07320542c129dFEecb04cf3E2')
    console.log('pool address:', poolContract.address)    
    console.log('approvedToken:', await poolContract.approvedToken())
  }
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

module.exports = PoolManager