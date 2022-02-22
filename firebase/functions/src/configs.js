exports.configs = {
  // Infura RPC provder and private key of cloud signer
  provider: process.env.RPC_PROVIDER,

  // Biconomy values
  biconomyApiKey: process.env.BICONOMY_API_KEY,
  biconomyWhitelistToken: process.env.BICONOMY_WHITELIST_TOKEN,
  biconomyExecTxApiId: '5f202bbe-a5ff-4bcc-a593-b50e1fb79218',
  biconomyCreateProxyApiId: '43d96227-f32e-4020-bd8c-021793b5ac98',

  // Generated bearer auth for endpoint
  bearerAuthToken: process.env.BEARER_AUTH,

  // Smart contract addresses
  proxyFactoryAddress: process.env.PROXY_FACTORY_ADDRESS,
  gnosisSafeAddress: process.env.GNOSIS_SAFE_ADDRESS
}