exports.configs = {
  // Infura RPC provder and private key of cloud signer
  provider: process.env.RPC_PROVIDER,

  // Biconomy values
  biconomyApiKey: process.env.BICONOMY_API_KEY,
  biconomyWhitelistToken: process.env.BICONOMY_WHITELIST_TOKEN,
  biconomyExecTxApiId: '8bf5bc81-c159-46db-bd4d-84549e366165',
  biconomyCreateProxyApiId: '12d2a1b4-b274-4771-9d5a-9fd6d89b3f94',

  // Generated bearer auth for endpoint
  bearerAuthToken: process.env.BEARER_AUTH,

  // Smart contract addresses
  proxyFactoryAddress: process.env.PROXY_FACTORY_ADDRESS,
  gnosisSafeAddress: process.env.GNOSIS_SAFE_ADDRESS
}