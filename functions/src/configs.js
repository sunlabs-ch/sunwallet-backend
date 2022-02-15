import * as functions from 'firebase-functions'
const envValues = Object.keys(functions.config()).length ? functions.config() : require('./env.json')

export const configs = {
  // Infura RPC provder and private key of cloud signer
  provider: envValues.env.rpc_provider,

  // Biconomy values
  biconomyApiKey: envValues.env.biconomy_api_key,
  biconomyWhitelistToken: envValues.env.biconomy_whitelist_token,
  biconomyExecTxApiId: '8bf5bc81-c159-46db-bd4d-84549e366165',
  biconomyCreateProxyApiId: '12d2a1b4-b274-4771-9d5a-9fd6d89b3f94',

  // Generated bearer auth for endpoint
  bearerAuthToken: envValues.env.bearer_auth,

  // Smart contract addresses
  proxyFactoryAddress: envValues.env.proxy_factory_contract,
  gnosisSafeAddress: envValues.env.gnosis_safe_address
}