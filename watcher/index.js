require('dotenv').config()

const admin = require('firebase-admin')
const axios = require('axios')
const Web3 = require('web3')

const {
  RPC_PROVIDER,
  FACTORY_ADDRESS,
  BICONOMY_WHITELIST_TOKEN
} = process.env

const factoryAbi = require('./abi.json')
const serviceAccount = require('../biconomy-gnosis.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
const db = admin.firestore()
console.log('= DB connected!')

const web3 = new Web3(new Web3.providers.WebsocketProvider(RPC_PROVIDER))
const contract = new web3.eth.Contract(factoryAbi, FACTORY_ADDRESS)

const initApp = () => {
  console.log('= Watching for new events!')
  web3.eth.net.getNetworkType().then(network => console.log('= Network', network))

  contract.events.ProxyCreation()
  .on('data', async (event) => {
    try {
      console.log('= New event received!', event.transactionHash)

      let localProxyAddress = hexStripZeros(event.raw.data)
      if (localProxyAddress.length < 42) {
        localProxyAddress = fixTrailingZero(localProxyAddress)
      }

      const result = await db
        .collection('usersContracts')
        .where('transaction', '==', event.transactionHash.toLowerCase())
        .get()

      if (result.docs[0] && result.docs[0].id) {
        console.log('= User ID', result.docs[0].id)
        console.log('= New proxy contract', localProxyAddress)

        await db
          .collection('usersContracts')
          .doc(result.docs[0].id)
          .update({
            status: 'SUCCESS',
            contract: web3.utils.toChecksumAddress(localProxyAddress)
          })

        await whitelistAddresses([localProxyAddress])
      }
    } catch (error) {
      console.log('= Error found!', error)
    }
  })
  .on('error', (error) => {
    console.log('= Error!', error)
  })
}

const fixTrailingZero = (address) => {
  let trailingZero = ''

  for (let index = 0; index < (42 - address.length); index++) {
    trailingZero += '0'
  }

  return `${address.substring(0, 2)}${trailingZero}${address.substring(2, address.length)}`
}

const hexStripZeros = (value) => {
  if (!web3.utils.isHex(value)) {
    throw new Error('invalid hex string', { arg: 'value', value: value })
  }

  while (value.length > 3 && value.substring(0, 3) === '0x0') {
      value = '0x' + value.substring(3)
  }

  return value
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

initApp()