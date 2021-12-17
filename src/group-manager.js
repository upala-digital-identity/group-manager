const { UpalaConstants } = require('@upala/constants')
const { ethers, utils } = require('ethers')
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
async function deployPool(poolType, wallet) {
  // Prepare pool factory (get address from constants depending on chainID)
  const upConsts = new UpalaConstants(await wallet.getChainId())
  const poolFactoryTemp = upConsts.getContract(poolType + 'Factory', wallet)

  // Spawn a new pool from pool factory
  const tx = await poolFactoryTemp.connect(wallet).createPool()

  // retrieve new pool address from Upala event (todo - is there an easier way?)
  const blockNumber = (await tx.wait(1)).blockNumber
  const upala = upConsts.getContract('Upala', wallet)
  const eventFilter = upala.filters.NewPool()
  const events = await upala.queryFilter(eventFilter, blockNumber, blockNumber)
  const newPoolAddress = events[0].args.poolAddress

  // returns ethersJS pool contact
  return attachToPool(poolType, wallet, newPoolAddress, upConsts)
}

// attaches to an existing pool factory of selected pool type
async function attachToPool(poolType, wallet, poolAddress, upalaConstants) {
  const upConsts = (upalaConstants) ? upalaConstants : new UpalaConstants(await wallet.getChainId())
  return upConsts.getContract(poolType, wallet, poolAddress) // pool contact as per ethersJS
}

// Graph gateway
// "is this bundleHash deleted"
// "what is the current base score for the pool address"
class Graph {
  constructor(endpoint) {
    this.endpoint = endpoint
  }
}

class FileBasedDB {
  constructor(workdir) {
    this.workdir = workdir
    this.checkOrCreateDir(this.workdir)
  }

  checkOrCreateDir(dir) {
    // check write permissions
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }
    // check write permissions
    fs.accessSync(dir, fs.constants.W_OK)
  }

  buildFullDir(relativeDirArray) {
    const relativeDir = relativeDirArray.join('/')
    return path.join(this.workdir, relativeDir)
  }

  createDir(relativeDirArray) {
    relativeDirArray.forEach(dir => { checkOrCreateDir(dir) });
  }

  save(relativeDirArray, fileName, fileContents) {


    // todo build relativeDirArray out of array
    

    const fullDir = buildFullDir(relativeDirArray)
    fs.writeFileSync(path.join(fullDir, fileName), fileContents)
  }

  getOneFile(relativeDirArray) {
    const fullDir = buildFullDir(relativeDirArray)
    const unprocessed = fs.readdirSync(fullDir)
    if (unprocessed[0]) {
      return JSON.parse(fs.readFileSync(path.join(fullDir, unprocessed[0])))
    } else {
      return null
    }
  }

  getFoldersList(relativeDirArray) {
    const fullDir = buildFullDir(relativeDirArray)
    return fs.readdirSync(fullDir).filter(function (file) {
      return fs.statSync(fullDir + '/' + file).isDirectory()
    })
  }
}

// Publicly available individual scores DB. Stores scores and their proofs.
// (while POCing need to publish 'live' folder of Local DB)
class ScoreExplorer {
  constructor(workdir) {
    this.fileBasedDB = new FileBasedDB(workdir)
    this.publishedDir = 'published'
  }
  publishBundle(subBundle) {
    return this.fileBasedDB.save(
      [this.publishedDir],
      subBundle.public.subBundleID.slice(-6) + '.json',
      JSON.stringify(subBundle, null, 2))
  }
}

// Stores and retrieve unprocessed subBundles
// Moves subBundles through the following folders:
// "unprocessed" -> "live"
class LocalDB {
  constructor(workdir, options) {
    // define paths (todo skip saving to disk (for tests))
    this.workdir = workdir
    this.unprocessedDir = 'unprocessed'
    this.liveDir = 'live'
  }

  // saves subBundle "as is" into a JSON file
  storeAsUnprocessed(subBundle) {
    // production add date as prefix
    return this.fileBasedDB.save(
      [this.unprocessedDir],
      subBundle.public.subBundleID.slice(-6) + '.json',
      JSON.stringify(subBundle, null, 2))
  }

  // saves subBundle "as is" into a JSON file
  storeProcessed(subBundle) {
    // production add date as prefix
    const slicedBundleName = subBundle.public.bundleID.slice(-6)
    const slicedSubBundleName = subBundle.public.subBundleID.slice(-6)
    return this.fileBasedDB.save(
      [this.liveDir, slicedBundleName],
      slicedSubBundleName + '.json',
      JSON.stringify(subBundle, null, 2)
    )
  }

  clearUnprocessed() {
    this.fileBasedDB.clearDir([this.unprocessedDir])
  }

  // retrieves subBundle object from JSON
  getUnprocessedSubBundle() {
    const unprocessed = this.fileBasedDB.getOneFile([this.unprocessedDir])
    if (unprocessed) {
      return JSON.parse(unprocessed)
    } else {
      // returning empty subBundle
      return { public: {} }
    }
  }

  // returns list of all public subBundles
  getActiveBundlesList() {
    return getFoldersList([this.liveDir])
  }
}

// Manages all settings of the provided pool
// Individual user scores come in bundles (and in subBundles).
// Can process a signle bundle at a time.

// drafting postgre approach

// Pool 
//      poolAddress
//      poolManagerAddress

// Bundle (published on-chain)
//      bundleId - bundle written on-chain
//      poolAddress - link
//      ethTx - tx hash of publishBundle function call
//      ethTxMined - is tx mined, true or false

// SubBundle
//      subBundleId
//      bundleId
//      dbTransaction // the below goes to score Explorer (keep only for logging)
//          bundleId - bundle written on-chain
//          subBundleId
//          poolAddress
//          poolManagerAddress
//          signedUsers - users, scores and proofs for the scores
//          signature - signature of the all "public" fields

// Record
//      record id
//      user address
//      score
//      proof for the score
//      SubBundleID


// this.subBundle
//      ethTx - tx hash of publishBundle function call
//      ethTxMined - is tx mined, true or false
//      dbTransaction - a transaction to ScoreExplorer
//      users // input users and their scores (deleted after bundle is created)
//      public // the below goes to score Explorer
//          bundleId - bundle written on-chain
//          subBundleId
//          poolAddress
//          poolManagerAddress
//          signedUsers - users, scores and proofs for the scores
//          signature - signature of the all "public" fields
class PoolManager {
  constructor(pool, localDbEndpoint, scoreExplorerEndpoint) {
    // ARGS //
    this.pool = pool // Initialized pool
    this.localDB = new LocalDB(localDbEndpoint)
    this.scoreExplorer = new ScoreExplorer(scoreExplorerEndpoint)

    // INIT //
    // get signer out of pool contract
    this.signer = this.pool.signer
    // Load unprocessed sub bundle
    this.subBundle = this.localDB.getUnprocessedSubBundle()
  }



  /*************
  MANAGE BUNDLES
  **************/
  // as Signed Scores Pool may have multiple subBundles within single bundle
  // every subBundle is assigned a uniqe ID. Calculated the same way as
  // Bundle ID. The first subBundleID equals its Bundle ID

  // if queue is clean new score bundle can be created
  async publishNew(users) {
    this._requireCleanQueue()
    this.subBundle.users = users

    await this._createSubBundle()
    await this.process()
  }

  // if queue is clean scores can be appended to an existing bundle
  // (Append is available for Signed Scores Pool only)
  async append(users, bundleID) {
    // production. check if this is Signed scores pool
    this._requireCleanQueue()
    this._requireActiveBundleID(bundleID)

    this.subBundle.users = users
    this.subBundle.public.bundleID = bundleID
    this.subBundle.ethTx = 'see the first subBundle' // skipping tx step when processing
    this.subBundle.ethTxMined = true // skipping tx step

    await this._createSubBundle()
    await this.process()
  }

  // if there's an unprocessed bundle, this function should be called
  async process() {
    this._requireSubBundle()

    // process (saves status if fails)
    try {
      if (!this.subBundle.ethTx) {
        await this._pushToChain()
      }
      if (this.subBundle.ethTx && !this.subBundle.ethTxMined) {
        await this._waitTx()
      }
      if (this.subBundle.ethTxMined && !this.subBundle.dbTransaction) {
        await this._pushToRemoteDb()
      }
    } catch (error) {
      throw error
    } finally {
      if (subBundle.dbTransaction) {
        this.subBundle.status = "live"
        this.localDB.storeAsProcessed(this.subBundle)
        this.localDB.clearUnprocessed()
      } else {
        this.subBundle.status = "unprocessed"
        this.localDB.storeAsUnprocessed(this.subBundle)
      }
    }
  }

  // returns list of active bundles
  getActiveBundlesList() {
    return this.localDB.getActiveBundlesList()
  }

  // deletes score bundle from the pool (calls pool contract)
  async deleteScoreBundleId(scoreBundleId) {
    const tx = await this.pool.deleteScoreBundleId(scoreBundleId)
    this.userMessageCallback({ message: tx })
    const mined = tx.wait()
    this.userMessageCallback({ message: tx })
  }




  /*******
  INTERNAL
  ********/

  _requireSubBundle() {
    if (!this.subBundle.public.signature) {
      throw new Error('No users loaded. Publish or append users first')
    }
    return true
  }

  _requireCleanQueue() {
    if (this.subBundle.public.signature) {
      throw new Error('Got users processing. Finish processing first')
    }
    return true
  }

  async _requireActiveBundleID() {
    // production. graph
    if (await this._isBundleOnChain()) {
      return true
    } else {
      return false
    }
  }

  // sign individual scores
  // the signatures will be used by smart contract to prove user score
  async _signUsers(users, bundleID, signer) {
    const signedUsers = users
    for (const user of signedUsers) {
      const message = utils.solidityKeccak256(
        ['address', 'uint8', 'bytes32'], 
        [user.address, user.score, bundleID])
      user.signature = await signer.signMessage(message)
    }
    return signedUsers
  }

  // creates proof for users scores, signes public data
  async _createSubBundle() {
    // Assign subBunlde and Bundle ids
    this.subBundle.public.subBundleID = ethers.utils.hexZeroPad(
      '0x' + _objectHash(this.subBundle.users, { algorithm: 'md5' }),
      32
    ) 
    // For the first subBundleID, bundleID and subBundleID are equal
    if (!this.subBundle.public.bundleID) {
      this.subBundle.public.bundleID = this.subBundle.public.subBundleID
    }

    // Sign users
    this.subBundle.public.signedUsers = await this._signUsers(
      this.subBundle.users,
      this.subBundle.public.bundleID,
      this.signer
    )
    delete this.subBundle.users // don't need input users anymore

    // Append other necessary fields
    this.subBundle.public.poolAddress = this.pool.address
    this.subBundle.public.poolManagerAddress = this.signer.address

    // sign the whole bundle
    // (score explorer will use this signature for auth)
    const hash = '0x' + _objectHash(this.subBundle.public, { algorithm: 'md5' })
    // https://docs.ethers.io/v5/api/signer/#Signer-signMessage
    let binaryData = ethers.utils.arrayify(hash)
    this.subBundle.public.signature = await this.signer.signMessage(binaryData)
  }

  // pushes bundleID to pool contract (checks if bundleID is already there)
  async _pushToChain() {
    // todo "is it already onChain?" - do it with graph
    if ((await this._isBundleOnChain()) == false) {
      const tx = await this.pool.publishScoreBundleId(this.subBundle.public.bundleID)
      this.subBundle.ethTx = tx.hash
      await tx.wait(1)
      this.subBundle.ethTxMined = true
    } else {
      this.subBundle.error = 'BundleID already on chain'
    }
  }

  async _isBundleOnChain() {
    const timestampBN = await this.pool.scoreBundleTimestamp(
      this.subBundle.public.bundleID)
    return (timestampBN.toNumber() != 0)
  }

  // waits for the push tx to be mined
  async _waitTx() {
    const confirmations = 1
    if (await this.signer.provider.waitForTransaction(this.subBundle.ethTx, confirmations)) {
      this.subBundle.ethTxMined = true
    }
  }

  // pushes signed scores to ScoreExplorer (makes them publically available)
  async _pushToRemoteDb() {
    this.subBundle.dbTransaction = this.scoreExplorer.publishBundle(this.subBundle.public)
  }




  /***********
  MANAGE OTHER
  ************/
  // Probably these are not even needed (interact with the cotract on client?)
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
}


async function main() {
  // setup wallet
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
  const mnemonic = 'test test test test test test test test test test test junk'
  const poolManagerWallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider)

  // deploy pool
  // const poolContract = await deployPool(poolType = 'SignedScoresPool', wallet = poolManagerWallet)
  const poolContract = await attachToPool('SignedScoresPool', poolManagerWallet, "0x524F04724632eED237cbA3c37272e018b3A7967e")

  // manage pool
  const poolManager = new PoolManager(
    poolContract,
    "/Users/petrporobov/Projects/group-manager/workdir",
    "/Users/petrporobov/Projects/group-manager/workdir")
  const users = [
    { address: '0x2819c144d5946404c0516b6f817a960db37d4929', score: "4" },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', score: "5" }
  ]
  
  // await poolManager.publishNew(users)
  await poolManager.append(users, "0x000000000000000000000000000000007f3e126d15c10f83dfd0fd257e7030e1")
  
  // await poolManager.process()

  console.log('pool address:', poolContract.address)
  // console.log('approvedToken:', await poolContract.approvedToken())
}

main()
  .then(() => process.exit(0) )
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

module.exports = PoolManager
