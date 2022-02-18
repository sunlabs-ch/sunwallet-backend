const { web3 } = require('../services/Web3Service')
const { fetchUserData } = require('../services/DbService')
const { getContractWalletNonce } = require('../services/ContractService')

exports.isValidAddress = (address) => {
  return web3.utils.isAddress(address)
}

exports.toWei = (value) => {
  return web3.utils.toWei(value, 'ether')
}

exports.shortenAddress = (address, charsStart = 3, charsEnd = 4) => {
  return `${address.substring(0, charsStart + 2)}...${address.substring(
    address.length - charsEnd,
    address.length
  )}`
}

exports.getUserData = async (userWallet) => {
  let user = {
    nonce: 0,
    status: null,
    contract: null,
    creationTx: null,
    whitelisted: false
  }

  const userData = await fetchUserData(userWallet)

  if (userData) {
    user.status = userData.status
    user.contract = userData.contract
    user.creationTx = userData.creationTx
    user.whitelisted = userData.whitelisted

    if (userData.contract) {
      user.nonce = await getContractWalletNonce(contract)
    }
  }

  return user
}