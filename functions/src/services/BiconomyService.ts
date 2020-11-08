const Biconomy = require('@biconomy/mexa')
const axios = require('axios')

const { configs } = require('../configs')

export const biconomy = new Biconomy(
  configs.provider,
  {
    apiKey: configs.biconomyApiKey,
    debug: false,
    strict: true
  }
)

export const whitelistAddresses = async (destinationAddresses: string []) => {
  try {
    const biconomyWhitelistEndpoint = 'https://api.biconomy.io/api/v1/dapp/whitelist/destination'

    await axios.post(biconomyWhitelistEndpoint, {
      'destinationAddresses': destinationAddresses
    }, {
      'headers': {
        'Authorization': `User ${configs.biconomyWhitelistToken}`,
        'Content-Type': 'application/json'
      }
    })

    return
  } catch (error) {
    throw error
  }
}