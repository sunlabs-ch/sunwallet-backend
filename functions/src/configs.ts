import * as functions from 'firebase-functions'
const envValues = Object.keys(functions.config()).length ? functions.config() : require('../src/env.json')

export const configs = {
  // Infura RPC provder and private key of cloud signer
  provider: envValues.env.rpc_provider,
  signerPrivateKey: envValues.env.signer_private_key,

  // Biconomy values
  biconomyApiKey: envValues.env.biconomy_api_key,
  biconomyWhitelistToken: envValues.env.biconomy_whitelist_token,

  // Generated bearer auth for endpoint
  bearerAuthToken: envValues.env.bearer_auth,

  // Smart contract addresses
  proxyFactoryAddress: envValues.env.proxy_factory_contract,
  gnosisSafeAddress: envValues.env.gnosis_safe_address
}