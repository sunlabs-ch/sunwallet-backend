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
  FACTORY_ADDRESS,
  BICONOMY_WHITELIST_TOKEN
} = process.env

const Events = Object.freeze({
  ProxyCreation: 'ProxyCreation'
})

const ContractState = Object.freeze({
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

const whitelistAddresses = async (addresses) => {
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

const fixTrailingZero = (address) => {
  let trailingZero = ''

  for (let index = 0; index < (42 - address.length); index++) {
    trailingZero += '0'
  }

  return `${address.substring(0, 2)}${trailingZero}${address.substring(2, address.length)}`
}

const publishEvent = (eventName, event) => {
  console.log('[success] New event received!', event.transactionHash)

  if (eventName === Events['ProxyCreation']) {
    let localProxyAddress = hexStripZeros(event.raw.data)
    if (localProxyAddress.length < 42) {
      localProxyAddress = fixTrailingZero(localProxyAddress)
    }

    const txHash = event.transactionHash.toLowerCase()

    if (!processedTxs[txHash]) {
      db
      .collection('usersContracts')
      .where('transaction', '==', txHash)
      .where('status', '==', ContractState.PENDING)
      .get()
      .then(async (result) => {
        if (result && result.docs[0] && result.docs[0].id) {
          console.log('User ID =>', result.docs[0].id)
          console.log('New proxy contract =>', localProxyAddress)
          console.log('-----------')

          await db
            .collection('usersContracts')
            .doc(result.docs[0].id)
            .update({
              status: ContractState.SUCCESS,
              contract: localProxyAddress
            })

          await whitelistAddresses([localProxyAddress])
          processedTxs[txHash] = true
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
      FACTORY_ADDRESS
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
