const Web3 = require('web3')
const { biconomy } = require('./BiconomyService')

export const web3 = new Web3(biconomy)