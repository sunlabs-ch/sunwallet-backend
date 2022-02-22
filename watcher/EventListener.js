const axios = require('axios')
const admin = require('firebase-admin')
const serviceAccount = require('./biconomy-gnosis.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
const db = admin.firestore()
console.log('[success] DB connected!')

const factoryAbi = require('./abi.json')
const {
  PROXY_FACTORY_ADDRESS,
  BICONOMY_WHITELIST_TOKEN
} = process.env

const Events = Object.freeze({
  ProxyCreation: 'ProxyCreation'
})

const ContractState = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  SUCCESS: 'SUCCESS',
  PENDING: 'PENDING',
  FAILED: 'FAILED'
})

// Local storage for processed transactions
const processedTxs = {}

const subscribeLogEvent = (
  contract,
  eventName,
  fromBlock
) => {
  contract.events[eventName]({ fromBlock }).on('data', (event) => {
      publishEvent(eventName, event)
    }
  )
}

const whitelistBiconomy = async (addresses) => {
  try {
    const biconomyWhitelistEndpoint = 'https://api.biconomy.io/api/v1/dapp/whitelist/proxy-contracts'

    await axios.post(biconomyWhitelistEndpoint, {
      'addresses': addresses
    }, {
      'headers': {
        'Authorization': `User ${BICONOMY_WHITELIST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    return
  } catch (error) {
    throw error
  }
}

const hexStripZeros = (value) => {
  while (value.length > 3 && value.substring(0, 3) === '0x0') {
      value = '0x' + value.substring(3)
  }

  return value
}

const publishEvent = (eventName, event) => {
  console.log('[success] New event received!', event.transactionHash)

  if (eventName === Events['ProxyCreation']) {
    const contractWalletAddress = hexStripZeros(event.raw.data).substring(0, 42)
    const txHash = event.transactionHash.toLowerCase()

    if (!processedTxs[txHash]) {
      db
      .collection('users')
      .where('creationTx', '==', txHash)
      .where('status', '==', ContractState.PENDING)
      .get()
      .then(async (result) => {
        if (result && result.docs[0] && result.docs[0].id) {
          console.log('User ID =>', result.docs[0].id)
          console.log('New proxy contract =>', contractWalletAddress)

          await db
            .collection('users')
            .doc(result.docs[0].id)
            .update({
              status: ContractState.SUCCESS,
              contract: contractWalletAddress,
              whitelisted: true
            })

          await whitelistBiconomy([contractWalletAddress])
          processedTxs[txHash] = true
          console.log('Whitelisted')
          console.log('-----------')
        }
      })
    }
  }
}
class EventListener {
  constructor(
    web3,
    provider,
    fromBlock
  ) {
    this._fromBlock = fromBlock
    this._provider = provider
    this._web3 = web3

    // Contracts
    this._FactoryContract = new web3.eth.Contract(
      factoryAbi,
      PROXY_FACTORY_ADDRESS
    )

    // Handle websocket disconnects
    this._web3.currentProvider.on('error', () => {
      this._isWatchingEvents = false
      this.restartWatchEvents()
    })
  }

  watchEvents = () => {
    this._web3.eth.net
      .isListening()
      .then(() => {
        this._isWatchingEvents = true

        subscribeLogEvent(
          this._FactoryContract,
          Events['ProxyCreation'],
          this._fromBlock
        )
      })
      .catch((e) => {
        this._isWatchingEvents = false
        console.log(`[error] watchEvents: ${e.message}`)
        setTimeout(this.watchEvents.bind(this), 60000)
      })
  }

  restartWatchEvents = () => {
    console.log(`restartWatchEvents: ${this._isWatchingEvents}`)
    if (this._isWatchingEvents) return

    this._web3.eth.net
      .isListening()
      .then(() => {
        setTimeout(this.watchEvents.bind(this), 5000)
      })
      .catch((e) => {
        console.log(`[error] restartWatchEvents: ${e.message}`)
        setTimeout(this.restartWatchEvents.bind(this), 60000)
      })
  }
}

module.exports = EventListener
