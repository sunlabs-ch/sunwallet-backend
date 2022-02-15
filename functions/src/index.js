const functions = require("firebase-functions");
require('dotenv').config();

// Services
const { web3 } = require('./services/Web3Service')
const { postBiconomy, whitelistAddresses } = require('./services/BiconomyService')
const { getProxyContractNonce, getProxySetupData, getExecuteMethodData } = require('./services/ContractService')
const { addNewUser, fetchUserData, updateUserTransactionStatus } = require('./services/DbService')

// Utils
const { toWei, isValidAddress, shortenAddress } = require('./utils/helpers')
const { GnosisSafeAbi } = require('./utils/abi')

// Configs
const { configs } = require('./configs')
const { ContractState } = require('./constants/index');
const { user } = require("firebase-functions/v1/auth");

exports.createProxyContract = functions.https.onRequest(async (request, response) => {
  try {
    const { publicAddress } = request.body
    const { authorization } = request.headers

    if (!authorization || !publicAddress) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    if (!isValidAddress(publicAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }
    console.log('- Validation passed!')

    const userData = await fetchUserData(publicAddress)
    console.log('-', userData ? 'User exists!' : 'Creating a new user!')

    if (userData) {
      const {
        id,
        status
      } = userData

      // Currently user can own only 1 contract wallet!
      // This area should be changed, if user can own more then 1 contract wallet.
      switch (status) {
        case ContractState.SUCCESS:
          response.status(400).send('User contract already exists!')
          process.exit()
        case ContractState.PENDING:
          response.status(400).send('User contract already submitted!')
          process.exit()
        case ContractState.FAILED:
          await updateUserTransactionStatus(id, ContractState.PENDING)
      }
    }

    const proxySetupData = await getProxySetupData(publicAddress)

    try {
      const transaction = await postBiconomy({
        'toAddress': configs.proxyFactoryAddress,
        'userAddress': publicAddress,
        'txParams': [configs.gnosisSafeAddress, proxySetupData],
        'biconomyMethodKey': configs.biconomyCreateProxyApiId
      })

      await addNewUser(
        transaction.toLowerCase(),
        web3.utils.toChecksumAddress(publicAddress),
        ContractState.PENDING,
        null  // Contract address will be added after tx confirmation
      )

      response.status(200).send({ transaction })
      process.exit()
    } catch (error) {
      if (userData) await updateUserTransactionStatus(userData.id, ContractState.FAILED)
      response.status(502).send('Bad Gateway!')
      process.exit()
    }
  } catch (error) {
    response.status(502).send('Bad Gateway!')
  }
})

exports.executeMetaTx = functions.https.onRequest(async (request, response) => {
  try {
    const {
      publicAddress,
      destinationAddress,
      signature,
      value
    } = request.body
    const { authorization } = request.headers

    if (!authorization || !publicAddress || !destinationAddress || !signature || !value) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    if (!isValidAddress(publicAddress) || !isValidAddress(destinationAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    const userData = await fetchUserData(publicAddress)
    if (!userData || !userData.contract) {
      response.status(400).send(`${shortenAddress(publicAddress)} user has not contract wallet!`)
      process.exit()
    }

    await whitelistAddresses([destinationAddress])
    console.log('- Added to whitelist!')

    const txParams = await getExecuteMethodData(publicAddress, destinationAddress, signature, value, userData.contract)
    const transaction = await postBiconomy({
      'toAddress': userData.contract,
      'userAddress': publicAddress,
      'txParams': txParams,
      'biconomyMethodKey': configs.biconomyExecTxApiId
    })
    response.status(200).send({ transaction })
    process.exit()
  } catch (error) {
    response.status(502).send('Execution error!')
    process.exit()
  }
})

exports.getWalletInfo = functions.https.onRequest(async (request, response) => {
  try {
    const { publicAddress } = request.body
    const { authorization } = request.headers

    if (!publicAddress || !authorization) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    if (!isValidAddress(publicAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    console.log('- Validation passed!')

    const userData = await fetchUserData(publicAddress)

    let contract = null,
      transaction = null,
      nonce = null

    if (userData) {
      if (userData.contract) {
        contract = userData.contract
        nonce = await getProxyContractNonce(contract)
      }

      if (userData.transaction) {
        transaction = userData.transaction
      }
    }

    response.status(200).send({
      nonce,
      contract,
      transaction
    })
    process.exit()
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})

// FOR DEMO PURPOSES ONLY
// This logic should be handled on the frontend/mobile side
// This cloud method should be removed after production release!
exports.getSignature = functions.https.onRequest(async (request, response) => {
  try {
    const {
      publicAddress,
      walletPrivateKey,
      toAddress,
      value
    } = request.body

    if (!publicAddress || !toAddress || !walletPrivateKey || !value) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (!isValidAddress(publicAddress) || !isValidAddress(toAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    const userData = await fetchUserData(publicAddress)
    if (!userData) {
      response.status(400).send(`${shortenAddress(publicAddress)} user has not contract wallet!`)
      process.exit()
    }

    const proxyContractAddress = userData.contract
    const proxyContract = new web3.eth.Contract(GnosisSafeAbi, proxyContractAddress)

    const valueWei = toWei(value)
    const operation = 0
    const gasPrice = 0
    const gasToken = '0x0000000000000000000000000000000000000000'
    let txGasEstimate = 0

    try {
        const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
        const estimateData = gnosisSafeMasterCopy.methods.requiredTxGas(toAddress, valueWei, '0x0', operation).encodeABI()

        const estimateResponse = await web3.eth.call({
          to: proxyContractAddress,
          from: proxyContractAddress,
          data: estimateData,
          gasPrice: 0
        }).catch((error) => {
          throw error
        })

        txGasEstimate = new web3.utils.toBN(estimateResponse.substring(138), 16)
        txGasEstimate = txGasEstimate.add(new web3.utils.toBN(10000), 16).toString()
    } catch(e) {
    }

    const nonce = await getProxyContractNonce(proxyContractAddress)
    const transactionHash = await proxyContract.methods.getTransactionHash(
      toAddress.toLowerCase(),
      valueWei,
      '0x0',
      operation,
      txGasEstimate,
      0,
      gasPrice,
      gasToken,
      publicAddress,
      nonce
    ).call()

    const signature = await web3.eth.accounts.sign(transactionHash.toString(), '0x' + walletPrivateKey)
    response.status(200).send(signature)
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})
