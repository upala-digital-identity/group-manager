const upalaConstants = require('upala-constants')
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')
const _objectHash = require('object-hash')

// TODO
// move pool creation/attachement out of PoolManager class
// different folders for different pools for local db
// decide on ethereum interaction (a function that get a tx and reports to user)
// 

/*********
INITIALIZE
**********/

async function deployPool(poolType, wallet) { // todo override addresses
    const addresses = upalaConstants.getAddresses({chainID: await wallet.getChainId()})
    const poolFactoryType = poolType + 'Factory'
    const poolFactoryTemp = new ethers.Contract(
        addresses[poolFactoryType], 
        upalaConstants.getAbis()[poolFactoryType], 
        wallet)

    const tx = await poolFactoryTemp.connect(wallet).createPool()
    const blockNumber = (await tx.wait(1)).blockNumber
    
    const upala = new ethers.Contract(
        addresses.Upala,
        upalaConstants.getAbis().Upala, 
        wallet)
    const eventFilter = upala.filters.NewPool();
    const events = await upala.queryFilter(eventFilter, blockNumber, blockNumber);
    const newPoolAddress = events[0].args.poolAddress
    return attachToPool(poolType, newPoolAddress, wallet)
}

async function attachToPool(poolType, poolAddress, wallet) {
    const poolContract = new ethers.Contract(
        poolAddress, 
        upalaConstants.getAbis()[poolType], 
        wallet)
    return poolContract
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
    // Moves users file through the following folders (or similar)
    // userss -> unprocessed (valid_users, receipt) -> live
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

    // PROPERTIES

    // localDB
    // scoreExplorer
    // wallet - todo require pool as argument instaed, get wallet from pool
    // addresses
    // userMessageCallback
    // pool - initialized pool contract // todo remove deploy/atach logic from class 
    // subBundle
    //      ethTx
    //      ethTxMined
    //      dbTransaction
    //      users // input users and their scores (deleted after signing)
    //      public // the below goes to score Explorer // transaction, record
    //          bundleId
    //          subBundleId
    //          poolAddress
    //          poolManagerAddress
    //          signedUsers
    //          signature - signature of the whole public data

    constructor(args) {

        // ARGS //

        // DBs
        this.localDB = new LocalDB(args.localDbEndpoint)
        this.scoreExplorer = new ScoreExplorer(args.scoreExplorerEndpoint)
        // Wallet
        this.wallet = args.wallet
        // Overrides
        this.addresses = args.overrideAddresses
        // Callback
        this.userMessageCallback = args.userMessageCallback

        // INIT //
        this.subBundle = this.localDB.getUnprocessedSubBundle()
    }

    /*************
    MANAGE SCORES
    *************/
    // as Signed Scores Pool may have multiple subBundles within single bundle
    // every subBundle is assigned a uniqe ID. Calculated the same way as 
    // Bundle ID. The first subBundleID equals its Bundle ID

    // if queue is clean new score bundle can be created
    publishNew(users) {
        // check
        this._requireCleanQueue()
        this.subBundle.users = users
        this.process()
    }

    // if queue is clean scores can be appended to an existing bundle 
    // Append is available for signed scores pool only
    append(users, bundleID) {
        // todo check if this is Signed scores pool
        this._requireCleanQueue()
        this._requireActiveBundleID(bundleID)
        this.subBundle.users = users

        // bundle data and users
        // bundleID is taken from args
        this.subBundle.public.bundleID = bundleID
        this.subBundle.ethTx = "see the first subBundle" // skipping tx step when processing
        this.subBundle.ethTxMined = true
        
        this.process()
    }

    // if there's an unprocessed bundle, this function should be called
    // new -> ☑️ bundleID -> ☑️ chain -> ☑️ signed -> ☑️ live
    process() {
        // check
        _requireUsers()

        // process (saves status if fails)
        try {
            !(this.subBundle.public.signature) ? await this._createSubBundle() : {}
            !(this.subBundle.ethTx) ? await this._pushToChain() : {}
            !(this.subBundle.ethTxMined) ? await this._waitTx() : {}
            !(this.subBundle.dbTransaction) ? await this._pushToRemoteDb() : {}
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

    _requireUsers() {
        if (!this.subBundle.users) {
            throw new Error("No users loaded. Publish or append users first") }
        return true
    }

    _requireCleanQueue() {
        if (this.subBundle.users) { 
            throw new Error("Got users processing. Finish processing first") }
        return true
    }

    _requireActiveBundleID(bundleID) {
        // is it already onChain? graph
        return true
    }

    // sign individual scores
    // the signatures will be used by smart contract to prove user score
    async _signUsers(users, bundleID, wallet) {
        const signedUsers = users
        for (const user of signedUsers) {
            const message = utils.solidityKeccak256(
                [ "address", "uint8", "bytes32" ], 
                [user.address, user.score, bundleID])
            user.signature = await wallet.signMessage(message)
        }
        return signedUsers
    }

    async _createSubBundle() {
        // Assign subBunlde and Bundle ids
        this.subBundle.public.subBundleID = _objectHash(subBundle.users, { algorithm: 'md5' })
        // For the first subBundleID, bundleID and subBundleID are equal
        if (!this.subBundle.public.bundleID) {
            this.subBundle.public.bundleID = this.subBundle.public.subBundleID
        }
        
        // Sing users
        this.subBundle.public.signedUsers = 
            this._signUsers(this.subBundle.users, this.subBundle.public.bundleID, this.wallet)
        delete this.subBundle.users // don't need input users anymore
        
        // Append other necessary fields
        this.subBundle.public.poolAddress = this.pool.address
        this.subBundle.public.poolManagerAddress = this.wallet.address

        // sign the whole bundle
        // (score explorer will use this signature for auth)
        const hash = _objectHash(
            this.subBundle.public, 
            { algorithm: 'md5' })
        // https://docs.ethers.io/v5/api/signer/#Signer-signMessage
        let binaryData = ethers.utils.arrayify(hash);
        this.subBundle.public.signature = await wallet.signMessage(binaryData)
    }

    async _pushToChain() {
        // todo is it already onChain? graph
        this.subBundle.ethTx = await this.pool.publishBundle(bundle)
    }

    async _waitTx() {
        await this.subBundle.ethTx.wait(1)
        this.subBundle.ethTxMined = true
    }

    async _pushToRemoteDb() {
        this.subBundle.dbTransaction = await this.scoreExplorer.publishBundle(bundle)
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