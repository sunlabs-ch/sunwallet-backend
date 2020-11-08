const ethers = require('ethers')

// Services
const { web3 } = require('./Web3Service')

// Utils
const { toWei } = require('../utils/helpers')
const { SunValidatorAbi, GnosisSafeAbi, ProxyFactoryAbi } = require('../utils/abi')

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

export const getProxyCreationTx = async (publicAddress: string) => {
  try {
    const gnosisSafeInstance = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
    const creationData = gnosisSafeInstance.methods.setup(
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

    const proxyFactory = new web3.eth.Contract(ProxyFactoryAbi, configs.proxyFactoryAddress)
    const tx = await proxyFactory.methods.createProxy(configs.gnosisSafeAddress, creationData).encodeABI()
    const estimateGas = await proxyFactory.methods.createProxy(configs.gnosisSafeAddress, creationData).estimateGas()

    const txParams = {
      'from': publicAddress,
      'gasLimit': estimateGas,
      'to': configs.proxyFactoryAddress,
      'value': '0x0',
      'data': tx
    }

    return txParams
  } catch (error) {
    throw error
  }
}

export const getExecuteMethodTx = async (publicAddress: string, destinationAddress: string, signature: any, value: any, contractWalletAddress: string) => {
  try {
    const proxyContractInstance = new web3.eth.Contract(GnosisSafeAbi, contractWalletAddress)
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

    const tx = await proxyContractInstance.methods.execTransaction(
        destinationAddress.toLowerCase(),
        valueWei,
        '0x0',
        operation,
        txGasEstimate,
        baseGasEstimate,
        gasPrice,
        gasToken,
        publicAddress,
        newSignature
    ).encodeABI()

    const txParams = {
      'from': publicAddress,
      'gasLimit': web3.utils.toHex(2100000),
      'to': contractWalletAddress,
      'value': '0x0',
      'data': tx
    }

    return txParams
  } catch (error) {
    throw error
  }
}