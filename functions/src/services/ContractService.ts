const ethers = require('ethers')

// Services
const { web3 } = require('./Web3Service')

// Utils
const { toWei } = require('../utils/helpers')
const { SunValidatorAbi, GnosisSafeAbi } = require('../utils/abi')

// Configs
const { configs } = require('../configs')

export const getProxyContractNonce = async (proxyAddress: string) => {
  try {
    const proxyContractInstance = new web3.eth.Contract(GnosisSafeAbi, proxyAddress)
    const nonce = await proxyContractInstance.methods.nonce().call()

    return nonce
  } catch (error) {
    throw error
  }
}

export const isAllowedToDoMeta = async (proxyAddress: string) => {
  try {
    const sunValidatorIntance = new web3.eth.Contract(SunValidatorAbi, configs.sunValidatorAddress)
    const isAllowed = await sunValidatorIntance.methods.allowedToDoMeta(proxyAddress).call()

    return isAllowed
  } catch (error) {
    throw error
  }
}

export const getProxyCreationData = async (publicAddress: string) => {
  try {
    const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
    const creationData = gnosisSafeMasterCopy.methods.setup(
      [publicAddress],
      configs.sunValidatorAddress,
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

export const getExecuteMethodData = async (publicAddress: string, destinationAddress: string, signature: any, value: any, contractWalletAddress: string) => {
  try {
    const valueWei = toWei(value)
    const operation = 0
    const gasPrice = 0
    const gasToken = '0x0000000000000000000000000000000000000000'
    let txGasEstimate: any = 0

    try {
      const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
      const estimateData = gnosisSafeMasterCopy.methods.requiredTxGas(destinationAddress, valueWei, '0x0', operation).encodeABI()

      const estimateResponse = await web3.eth.call({
        to: contractWalletAddress,
        from: contractWalletAddress,
        data: estimateData,
        gasPrice: 0
      }).catch((error: any) => {
        throw error
      })

      txGasEstimate = new web3.utils.toBN(estimateResponse.substring(138), 16)
      txGasEstimate = txGasEstimate.add(new web3.utils.toBN(10000), 16).toString()
    } catch (error) {
      throw error
    }

    // Get estimated base gas (Gas costs for that are independent of the transaction execution(e.g. base transaction fee, signature check, payment of the refund))
    const baseGasEstimate = 0
    const sig: any = ethers.utils.splitSignature(signature)
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
      publicAddress,
      newSignature
    ]
  } catch (error) {
    throw error
  }
}