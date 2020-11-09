require('dotenv').config()
const Web3 = require('web3')
const EventListener = require('./EventListener')

const {
  WSS_PROVIDER,
} = process.env

const web3 = new Web3(new Web3.providers.WebsocketProvider(WSS_PROVIDER))

const initApp = () => {
  console.log('[success] Watching for new events!')
  web3.eth.getBlockNumber().then(blockNumber => {
    console.log('Block number =>', blockNumber)
    // Start event listener
    const events = new EventListener(web3, WSS_PROVIDER, Number(blockNumber))
    events.watchEvents()
  })
}


initApp()