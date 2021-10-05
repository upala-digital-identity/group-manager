const upalaConstants = require('upala-constants')
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')
const objectHash = require('object-hash')

// TODO
// different folders for different pools for local db
// decide on what is being saved locally and what sent to remote db (current csv thing is not good)
// hashing, signing - do it first to finish the whole package prototype 
// decide on ethereum interaction (a function that get a tx and reports to user)
// 

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
        // if workdir, save to files (also connect with tests this way)
        if (endpoint.workdir) {

            this.workdir = endpoint.workdir

            // define paths
            this.unprocessedDir = path.join(this.workdir, "unprocessed")
            this.liveDir = path.join(this.workdir, "live")

            // check write permissions 
            fs.accessSync(path, fs.constants.W_OK);

            // create folders if needed
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
        }
    }

    updateSubBundle(subBundle) {
        const fileName = subBundle.subBundleID + ".json"
        if (subBundle.dbTransaction) {
            // todo add date to filename (the first subBundle will bear ethereum tx id)
            const live = path.join(this.liveDir, subBundle.bundleID, fileName)
            fs.writeFileSync(live, JSON.stringify(subBundle, null, 2))
        } else {
            const unprocessed = path.join(this.unprocessedDir, fileName)
            fs.writeFileSync(unprocessed, JSON.stringify(subBundle, null, 2))
        }
    }

    getUnprocessedSubBundle() {
        const unprocessed = fs.readdirSync(testFolder)
        if (unprocessed) {
            return JSON.parse(fs.readFileSync(unprocessed[0]))
        }
    }

    getActiveBundlesList(){
        return fs.readdirSync(this.liveDir).filter(function (file) {
            return fs.statSync(this.liveDir+'/'+file).isDirectory();
        });
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

        this.userMessageCallback = args.userMessageCallback

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
        
        // process
        this.subBundle.csv = csv
        this.process()
    }

    // if queue is clean scores can be appended to an existing bundle 
    // Append is available for signed scores pool only
    append(csv, bundleID) {
        // todo check if this is Signed scores pool
        this._requireCleanQueue()
        this._requireActiveBundleID(bundleID)

        // process
        this.subBundle.csv = csv
        this.subBundle.bundleID = bundleID
        this.subBundle.ethTx = "see the first subBundle" // any text to skip tx step when processing
        this.subBundle.ethTxMined = true
        this.process()
    }

    // if there's an unprocessed bundle, this function should be called
    // new -> ☑️ bundleID -> ☑️ chain -> ☑️ signed -> ☑️ live
    process() {
        // check
        _requireCSV()

        // as Signed Scores Pool may have multiple subBundles within single bundle
        // every subBundle is assigned a uniqe ID. Calculated the same way as 
        // Bundle ID. The first subBundleID equals its Bundle ID
        this.subBundle.subBundleID = objectHash(this.subBundle.csv, { algorithm: 'md5' })
        if (!this.subBundle.bundleID) {
            this.subBundle.bundleID = this.subBundle.subBundleID
        }

        // process
        try {
            !(this.subBundle.subBundleID) ? //todo
            
            this._signCSVs() : {}
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
        const tx = await this.pool.deleteScoreBundleId(scoreBundleId)
        this.userMessageCallback({message: tx})
        const mined = tx.wait()
        this.userMessageCallback({message: tx})
    }

    async getBaseScore() {
        return await this.pool.baseScore()
    }

    async setBaseScore(newScore) {
        // todo same logic as with deleteScoreBundleId
        this.pool.setBaseScore(newScore)
    }

    /***********
    MANAGE OTHER
    ************/

    async withdrawFromPool(recipient, amount) {
        // todo same logic as with deleteScoreBundleId
        this.pool.withdrawFromPool(recipient, amount)
    }

    async updateMetadata(newMetadata) {
        // todo same logic as with deleteScoreBundleId
        this.pool.updateMetadata(newMetadata)
    }

    /*******
    INTERNAL
    ********/

    _requireCSV() {
        if (this.subBundle.csv) {
            throw new Error("No CSV loaded. Publish or append csv first") }
        return true
    }

    _requireCleanQueue() {
        if (!this.subBundle.csv) { 
            throw new Error("Got CSV processing. Finish processing first") }
        return true
    }

    _requireActiveBundleID(bundleID) {
        // is it already onChain? graph
        return true
    }




    async _sign() {
        // sign individual scores
        // the signatures will be used by smart contract to prove user score
        for (const user of this.subBundle.csv) {
            const message = utils.solidityKeccak256(
                [ "address", "uint8", "bytes32" ], 
                [user.address, user.score, this.subBundle.bundleID])
            user.signature = await this.wallet.signMessage(message)
        }
        // sign the whole bundle 
        // (score explorer will use this signature for auth)
        objectHash(
            {
                poolAddress: this.pool.address,
                poolManagerAddress: this.wallet.address,
                scoreBundleId: this.subBundle.bundleID,
                scoreSubBundleId: this.subBundle.subBundleID,
                claims: this.subBundle.csv
            }, 
            { algorithm: 'md5' })
    }




    _pushToChain() {
        // is it already onChain? graph
        this.subBundle.ethTx = this.pool.publishBundle(bundle)
    }

    _waitTx() {
        this.subBundle.ethTx.wait(1)
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