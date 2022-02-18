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

exports.getExecuteMethodData = async (userWallet, destinationAddress, signature, value, contractWalletAddress) => {
  try {
    const valueWei = toWei(value)
    const operation = 0
    const gasPrice = 0
    const gasToken = '0x0000000000000000000000000000000000000000'
    let txGasEstimate = 0

    try {
      const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
      const estimateData = gnosisSafeMasterCopy.methods.requiredTxGas(destinationAddress, valueWei, '0x0', operation).encodeABI()

      const estimateResponse = await web3.eth.call({
        to: contractWalletAddress,
        from: contractWalletAddress,
        data: estimateData,
        gasPrice: 0
      }).catch((error) => {
        throw error
      })

      txGasEstimate = new web3.utils.toBN(estimateResponse.substring(138), 16)
      txGasEstimate = txGasEstimate.add(new web3.utils.toBN(10000), 16).toString()
    } catch (error) {
      throw error
    }

    // Get estimated base gas (Gas costs for that are independent of the transaction execution(e.g. base transaction fee, signature check, payment of the refund))
    const baseGasEstimate = 0
    const sig = ethers.utils.splitSignature(signature)
    const newSignature = `${sig.r}${sig.s.substring(2)}${Number(sig.v + 4).toString(16)}`

    return [
      destinationAddress,
      valueWei,
      '0x0',
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