exports.configs = {
  // Infura RPC provder and private key of cloud signer
  provider: process.env.RPC_PROVIDER,

  // Biconomy values
  biconomyApiKey: process.env.BICONOMY_API_KEY,
  biconomyWhitelistToken: process.env.BICONOMY_WHITELIST_TOKEN,

  biconomyExecTxApiId: '8582a0eb-1f4e-4296-bc11-24f3eb3719d7',
  biconomyCreateProxyApiId: 'b5d6828c-28aa-4c9e-bb66-df795de62bf8',

  // Generated bearer auth for endpoint
  bearerAuthToken: process.env.BEARER_AUTH,

  // Smart contract addresses
  proxyFactoryAddress: process.env.PROXY_FACTORY_ADDRESS,
  gnosisSafeAddress: process.env.GNOSIS_SAFE_ADDRESS
}