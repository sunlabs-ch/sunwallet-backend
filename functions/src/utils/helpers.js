const { web3 } = require('../services/Web3Service')

export const isValidAddress = (address) => {
  return web3.utils.isAddress(address)
}

export const toWei = (value) => {
  return web3.utils.toWei(value, 'ether')
}

export const shortenAddress = (address, charsStart = 3, charsEnd = 4) => {
  return `${address.substring(0, charsStart + 2)}...${address.substring(
    address.length - charsEnd,
    address.length
  )}`
}