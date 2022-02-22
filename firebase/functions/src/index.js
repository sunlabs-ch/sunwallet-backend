require('dotenv').config();
const functions = require("firebase-functions");

// Services
const { web3 } = require('./services/Web3Service')
const { addNewUser } = require('./services/DbService')
const {
  postBiconomy,
  whitelistBiconomy
} = require('./services/BiconomyService')
const {
  getContractWalletNonce,
  getContractWalletSetupData,
  getExecuteMethodData
} = require('./services/ContractService')

// Utils
const {
  toWei,
  isValidAddress,
  shortenAddress,
  getUserData
} = require('./utils/helpers')
const { GnosisSafeAbi } = require('./utils/abi')

// Configs
const { configs } = require('./configs')
const { ContractState } = require('./constants/index');

exports.createContractWallet = functions.https.onRequest(async(request, response) => {
  try {
    const {
      userWallet
    } = request.body
    const {
      authorization
    } = request.headers

    if (!authorization || !userWallet) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (!isValidAddress(userWallet)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    // Exit if creation already was submitted
    let userData = await getUserData(userWallet)
    if (userData.creationTx) {
      response.status(200).send(userData)
      process.exit()
    }

    const setupData = await getContractWalletSetupData(userWallet)
    const creationTx = await postBiconomy({
      'toAddress': configs.proxyFactoryAddress,
      'userAddress': userWallet,
      'txParams': [configs.gnosisSafeAddress, setupData],
      'biconomyMethodKey': configs.biconomyCreateProxyApiId
    })

    await addNewUser(
      creationTx.toLowerCase(),
      web3.utils.toChecksumAddress(userWallet),
      ContractState.PENDING,
      null, // Contract address will be added after tx confirmation
      false // Will be whitelisted before meta-tx
    )

    // Fetch updated data for responding
    userData = await getUserData(userWallet)

    response.status(200).send(userData)
    process.exit()
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})

exports.executeMetaTx = functions.https.onRequest(async(request, response) => {
  try {
    const {
      userWallet,
      destinationAddress,
      signature,
      value
    } = request.body
    const {
      authorization
    } = request.headers

    if (!authorization || !userWallet || !destinationAddress || !signature || !value) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (!isValidAddress(userWallet) || !isValidAddress(destinationAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    const userData = await getUserData(userWallet)
    if (!userData || !userData.contract) {
      response.status(400).send(`${shortenAddress(userWallet)} user has not contract wallet!`)
      process.exit()
    }

    // Whitelist destination address before meta execution
    await whitelistBiconomy([destinationAddress])

    const txParams = await getExecuteMethodData(
      userWallet,
      destinationAddress,
      signature,
      value,
      userData.contract
    )

    const transaction = await postBiconomy({
      'toAddress': userData.contract,
      'userAddress': userWallet,
      'txParams': txParams,
      'biconomyMethodKey': configs.biconomyExecTxApiId
    })
    response.status(200).send({
      transaction
    })
    process.exit()
  } catch (error) {
    response.status(502).send('Execution error!')
    process.exit()
  }
})

exports.getUserData = functions.https.onRequest(async(request, response) => {
  try {
    const {
      userWallet
    } = request.body
    const {
      authorization
    } = request.headers

    if (!userWallet || !authorization) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (!isValidAddress(userWallet)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    const userData = await getUserData(userWallet)

    response.status(200).send(userData)
    process.exit()
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})

// FOR DEMO PURPOSES ONLY
// This logic should be handled on the frontend/mobile side
// This cloud method should be removed after production release!
exports.getSignature = functions.https.onRequest(async(request, response) => {
  try {
    const {
      userWallet,
      walletPrivateKey,
      toAddress,
      value
    } = request.body

    if (!userWallet || !toAddress || !walletPrivateKey || !value) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (!isValidAddress(userWallet) || !isValidAddress(toAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    const userData = await getUserData(userWallet)
    if (!userData.contract) {
      response.status(404).send('Contract wallet not found!')
      process.exit()
    }

    const contractWallet = userData.contract
    const contractWalletInstance = new web3.eth.Contract(GnosisSafeAbi, contractWallet)

    const valueWei = toWei(value)
    const operation = 0
    const gasPrice = 0
    const gasToken = '0x0000000000000000000000000000000000000000'
    let txGasEstimate = 0

    try {
      const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
      const estimateData = gnosisSafeMasterCopy.methods.requiredTxGas(toAddress, valueWei, '0x', operation).encodeABI()

      const estimateResponse = await web3.eth.call({
        to: contractWallet,
        from: contractWallet,
        data: estimateData,
        gasPrice: 0
      }).catch((error) => {
        throw error
      })

      txGasEstimate = new web3.utils.toBN(estimateResponse.substring(138), 16)
      txGasEstimate = txGasEstimate.add(new web3.utils.toBN(10000), 16).toString()
    } catch (error) {
      console.log('Could not estimate, because of ' + error)
    }

    const nonce = await getContractWalletNonce(contractWallet)
    const transaction = await contractWalletInstance.methods.getTransactionHash(
      toAddress.toLowerCase(),
      valueWei,
      '0x',
      operation,
      txGasEstimate,
      0,
      gasPrice,
      gasToken,
      userWallet,
      nonce
    ).call()

    const signature = await web3.eth.accounts.sign(transaction.toString(), '0x' + walletPrivateKey)
    response.status(200).send(signature)
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})