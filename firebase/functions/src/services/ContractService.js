const ethers = require('ethers')

// Services
const { web3 } = require('./Web3Service')

// Utils
const { toWei } = require('../utils/helpers')
const { GnosisSafeAbi } = require('../utils/abi')

// Configs
const { configs } = require('../configs')

exports.getContractWalletNonce = async (walletContract) => {
  try {
    const contractWalletInstance = new web3.eth.Contract(GnosisSafeAbi, walletContract)
    const nonce = await contractWalletInstance.methods.nonce().call()

    return nonce
  } catch (error) {
    throw error
  }
}

exports.getContractWalletSetupData = async (userWallet) => {
  try {
    const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
    const creationData = gnosisSafeMasterCopy.methods.setup(
      [userWallet],
      1,
      '0x0000000000000000000000000000000000000000',
      '0x0',
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      0,
      '0x0000000000000000000000000000000000000000'
    ).encodeABI()

    return creationData
  } catch (error) {
    throw error
  }
}

exports.getExecuteMethodData = async (userWallet, destinationAddress, signature, value, contractWalletAddress, data) => {
  try {
    const valueWei = toWei(value)
    const operation = 0
    const gasPrice = 0
    const gasToken = '0x0000000000000000000000000000000000000000'
    const txGasEstimate = await this.getRequiredGasTx(contractWalletAddress, destinationAddress, valueWei, data, operation)

    // Get estimated base gas (Gas costs for that are independent of the transaction execution(e.g. base transaction fee, signature check, payment of the refund))
    const baseGasEstimate = 0
    const sig = ethers.utils.splitSignature(signature)
    const newSignature = `${sig.r}${sig.s.substring(2)}${Number(sig.v + 4).toString(16)}`

    return [
      destinationAddress,
      valueWei,
      data,
      operation,
      txGasEstimate,
      baseGasEstimate,
      gasPrice,
      gasToken,
      userWallet,
      newSignature
    ]
  } catch (error) {
    throw error
  }
}

exports.getRequiredGasTx = async (contractWallet, toAddress, value, data, operation) => {
  const contractWalletInstance = new web3.eth.Contract(GnosisSafeAbi, contractWallet)
  const estimateData = contractWalletInstance.methods.requiredTxGas(toAddress, value, data, operation).encodeABI()
  let txGasEstimate = 0

  try {
    const estimateResponse = await web3.eth.call({
      to: contractWallet,
      from: contractWallet,
      data: estimateData,
      gasPrice: 0
    })

    // https://docs.gnosis.io/safe/docs/contracts_tx_execution/#safe-transaction-gas-limit-estimation
    // The value returned by requiredTxGas is encoded in a revert error message. For retrieving the hex
    // encoded uint value the first 68 bytes of the error message need to be removed.
    txGasEstimate = parseInt(estimateResponse.substring(138), 16)

    // Multiply with 64/63 due to EIP-150 (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-150.md)
    txGasEstimate = Math.ceil((txGasEstimate * 64) / 63)
  } catch (error) {
    console.log('Could not estimate, because of ' + error)
  }

  return txGasEstimate
}