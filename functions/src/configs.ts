import * as functions from 'firebase-functions'
const envValues = Object.keys(functions.config()).length ? functions.config() : require('../src/env.json')

export const configs = {
  // Infura RPC provder and private key of cloud signer
  provider: envValues.env.RPC_PROVIDER,
  signerPrivateKey: envValues.env.SIGNER_PRIVATE_KEY,

  // Biconomy values
  biconomyApiKey: envValues.env.BICONOMY_API_KEY,
  biconomyWhitelistToken: envValues.env.BICONOMY_WHITELIST_TOKEN,

  // Generated bearer auth for endpoint
  bearerAuthToken: envValues.env.BEARER_AUTH,

  // Smart contract addresses
  proxyFactoryAddress: envValues.env.PROXY_FACTORY_CONTRACT,
  gnosisSafeAddress: envValues.env.GNOSIS_SAFE_ADDRESS,
  sunValidatorAddress: envValues.env.SUN_VALIDATOR
}