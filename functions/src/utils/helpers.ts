const { web3 } = require('../services/Web3Service')

export const isValidAddress = (address: any) => {
  return web3.utils.isAddress(address)
}

export const toWei = (value: any) => {
  return web3.utils.toWei(value, 'ether')
}

export const shortenAddress = (address: string, charsStart = 3, charsEnd = 4) => {
  return `${address.substring(0, charsStart + 2)}...${address.substring(
    address.length - charsEnd,
    address.length
  )}`
}