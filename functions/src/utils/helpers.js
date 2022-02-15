const { web3 } = require('../services/Web3Service')

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