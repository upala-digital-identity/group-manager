const upalaConstants = require('upala-constants')
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')
const _objectHash = require('object-hash')

// Production TODOs (see "production" comments)
// better Error handling (causes) 
// decide on ethereum interaction (a function that get a tx and reports to user)

/******************
POOL INITIALIZATION 
*******************/

// deploys new pool through a pool factory of selected pool type 
async function deployPool(poolType, wallet) { // todo override addresses
    // Prepare pool factory (get address from constants depending on chainID)
    const addresses = upalaConstants.getAddresses({chainID: await wallet.getChainId()})
    const poolFactoryType = poolType + 'Factory'
    const poolFactoryTemp = new ethers.Contract(
        addresses[poolFactoryType], 
        upalaConstants.getAbis()[poolFactoryType], 
        wallet)
    
    // Spawn a new pool from pool factory
    const tx = await poolFactoryTemp.connect(wallet).createPool()
    const blockNumber = (await tx.wait(1)).blockNumber
    
    // retrieve new pool address from Upala event (todo - is there an easier way?)
    const upala = new ethers.Contract(
        addresses.Upala,
        upalaConstants.getAbis().Upala, 
        wallet)
    const eventFilter = upala.filters.NewPool();
    const events = await upala.queryFilter(eventFilter, blockNumber, blockNumber);
    const newPoolAddress = events[0].args.poolAddress
    
    // returns ethersJS pool contact
    return attachToPool(poolType, newPoolAddress, wallet)
}

// attaches to an existing pool factory of selected pool type
async function attachToPool(poolAddress, poolType, wallet) {
    const poolContract = new ethers.Contract(
        poolAddress, 
        upalaConstants.getAbis()[poolType], 
        wallet)
    return poolContract // pool contact as per ethersJS
}

// Graph gateway
// "is this bundleHash deleted"
// "what is the current base score for the pool address"
class Graph {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
}

// Publicly available individual scores DB. Stores scores and their proofs.
// (while POCing need to publish 'live' folder of Local DB)
class ScoreExplorer {
    constructor(endpoint) {}
    publishBundle(bundle) {
        return "For now let us all agree the scores are published"
    }
}

// Stores and retrieve unprocessed subBundles
// Moves subBundles through the following folders:
// "unprocessed" -> "live"
class LocalDB {

    constructor(workdir, options) {
        // todo option skipSaving - for tests
        this.workdir = workdir

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

    // saves subBundle "as is" into a JSON file
    updateSubBundle(subBundle) {
        const fileName = subBundle.subBundleID + ".json"
        // considers the subBundle is "live" if dbTransaction is present
        // (meaning it is both on-chain and proofs are available publically)
        // otherwise the subBundle is "unprocessed"
        if (subBundle.dbTransaction) {
            // todo add date to filename (the first subBundle will bear ethereum tx id)
            const live = path.join(this.liveDir, subBundle.bundleID, fileName)
            fs.writeFileSync(live, JSON.stringify(subBundle, null, 2))
        } else {
            const unprocessed = path.join(this.unprocessedDir, fileName)
            fs.writeFileSync(unprocessed, JSON.stringify(subBundle, null, 2))
        }
    }

    // retrieves subBundle object from JSON
    getUnprocessedSubBundle() {
        const unprocessed = fs.readdirSync(testFolder)
        if (unprocessed) {
            return JSON.parse(fs.readFileSync(unprocessed[0]))
        }
    }

    // returns list of all public subBundles
    getActiveBundlesList(){
        return fs.readdirSync(this.liveDir).filter(function (file) {
            return fs.statSync(this.liveDir+'/'+file).isDirectory();
        });
    }
}

// Manages all settings of the provided pool 
// Individual user scores come in bundles (and in subBundles). 
// Can process a signle bundle at a time.
// this.subBundle
//      ethTx - tx hash of publishBundle function call 
//      ethTxMined - is tx mined, true or false
//      dbTransaction - a transaction to ScoreExplorer
//      users // input users and their scores (deleted after bundle is created)
//      public // the below goes to score Explorer
//          bundleId
//          subBundleId
//          poolAddress
//          poolManagerAddress
//          signedUsers - users, scores and proofs for the scores
//          signature - signature of the all "public" fields
class PoolManager {

    // ARGS
    // pool - initialized pool contract
    // localDB
    // scoreExplorer
    constructor(args) {
        this.pool = args.pool // Initialized pool
        this.localDB = new LocalDB(args.localDbEndpoint)
        this.scoreExplorer = new ScoreExplorer(args.scoreExplorerEndpoint)
        
        // INIT //
        // get signer out of pool contract
        this.signer = args.pool.signer
        // Load unprocessed sub bundle
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
        this._requireCleanQueue()
        this.subBundle.users = users

        await this._createSubBundle()
        this.process()
    }

    // if queue is clean scores can be appended to an existing bundle 
    // (Append is available for Signed Scores Pool only)
    append(users, bundleID) {
        // production. check if this is Signed scores pool
        this._requireCleanQueue()
        this._requireActiveBundleID(bundleID)
        
        this.subBundle.users = users
        this.subBundle.public.bundleID = bundleID
        this.subBundle.ethTx = "see the first subBundle" // skipping tx step when processing
        this.subBundle.ethTxMined = true // skipping tx step
        
        await this._createSubBundle()
        this.process()
    }

    // if there's an unprocessed bundle, this function should be called
    process() {
        this._requireSubBundle()

        // process (saves status if fails)
        try { 
            !(this.subBundle.ethTx) ? await this._pushToChain() : {}
            !(this.subBundle.ethTxMined) ? await this._waitTx() : {}
            !(this.subBundle.dbTransaction) ? await this._pushToRemoteDb() : {}
        } catch ( error ) {
            throw( error );
        } finally {
            this.localDB.updateSubBundle(this.subBundle)
        }
    }

    // returns list of active bundles
    getActiveBundlesList() {
        return this.localDB.getActiveBundlesList()
    }

    // deletes score bundle from the pool (calls pool contract)
    async deleteScoreBundleId(scoreBundleId) {
        const tx = await this.pool.deleteScoreBundleId(scoreBundleId)
        this.userMessageCallback({message: tx})
        const mined = tx.wait()
        this.userMessageCallback({message: tx})
    }

    // retrieves base score from pool contract
    // production. use Graph?
    async getBaseScore() {
        return await this.pool.baseScore()
    }

    // sets new base score on the pool contract
    async setBaseScore(newScore) {
        // todo same logic as with deleteScoreBundleId
        this.pool.setBaseScore(newScore)
    }

    /***********
    MANAGE OTHER
    ************/

    // withdraws pool contract funds
    async withdrawFromPool(recipient, amount) {
        // todo same logic as with deleteScoreBundleId
        this.pool.withdrawFromPool(recipient, amount)
    }

    // updates pool contract metadata
    async updateMetadata(newMetadata) {
        // todo same logic as with deleteScoreBundleId
        this.pool.updateMetadata(newMetadata)
    }

    /*******
    INTERNAL
    ********/

    _requireSubBundle() {
        if (!this.subBundle.public.signature) {
            throw new Error("No users loaded. Publish or append users first") }
        return true
    }

    _requireCleanQueue() {
        if (this.subBundle.public.signature) { 
            throw new Error("Got users processing. Finish processing first") }
        return true
    }

    _requireActiveBundleID(bundleID) {
        // is it already onChain? production. graph
        return true
    }

    // sign individual scores
    // the signatures will be used by smart contract to prove user score
    async _signUsers(users, bundleID, signer) {
        const signedUsers = users
        for (const user of signedUsers) {
            const message = utils.solidityKeccak256(
                [ "address", "uint8", "bytes32" ], 
                [user.address, user.score, bundleID])
            user.signature = await signer.signMessage(message)
        }
        return signedUsers
    }

    // creates proof for users scores, signes public data 
    async _createSubBundle() {
        // Assign subBunlde and Bundle ids
        this.subBundle.public.subBundleID = _objectHash(subBundle.users, { algorithm: 'md5' })
        // For the first subBundleID, bundleID and subBundleID are equal
        if (!this.subBundle.public.bundleID) {
            this.subBundle.public.bundleID = this.subBundle.public.subBundleID
        }
        
        // Sing users
        this.subBundle.public.signedUsers = 
            this._signUsers(this.subBundle.users, this.subBundle.public.bundleID, this.signer)
        delete this.subBundle.users // don't need input users anymore
        
        // Append other necessary fields
        this.subBundle.public.poolAddress = this.pool.address
        this.subBundle.public.poolManagerAddress = this.signer.address

        // sign the whole bundle
        // (score explorer will use this signature for auth)
        const hash = _objectHash(
            this.subBundle.public, 
            { algorithm: 'md5' })
        // https://docs.ethers.io/v5/api/signer/#Signer-signMessage
        let binaryData = ethers.utils.arrayify(hash);
        this.subBundle.public.signature = await this.signer.signMessage(binaryData)
    }

    // pushes bundleID to pool contract
    async _pushToChain() {
        // todo is it already onChain? graph
        this.subBundle.ethTx = await this.pool.publishBundle(bundle)
    }

    // waits for the push tx to be mined 
    async _waitTx() {
        await this.subBundle.ethTx.wait(1)
        this.subBundle.ethTxMined = true  // todo is this ok?
    }

    // pushes signed scores to ScoreExplorer (makes them publically available)
    async _pushToRemoteDb() {
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