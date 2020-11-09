import * as functions from 'firebase-functions'

// Services
const { web3 } = require('./services/Web3Service')
const { biconomy, whitelistAddresses } = require('./services/BiconomyService')
const { getProxyContractNonce, isAllowedToDoMeta, getProxyCreationTx, getExecuteMethodTx } = require('./services/ContractService')
const { addNewUser, fetchUserData, updateUserTransactionStatus, updateUserTransactionHash } = require('./services/DbService')

// Utils
const { toWei, isValidAddress, shortenAddress } = require('./utils/helpers')
const { GnosisSafeAbi } = require('./utils/abi')

// Configs
const { configs } = require('./configs')
const { ContractState } = require('./constants/index')

export const createProxyContract = functions.https.onRequest((request, response) => {
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

  biconomy
  .onEvent(biconomy.READY, async () => {
    try {
      const userData = await fetchUserData(publicAddress)
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

      const txParams = await getProxyCreationTx(publicAddress)
      const signedTx: any = await web3.eth.accounts.signTransaction(txParams, '0x' + configs.signerPrivateKey)
      await web3.eth.sendSignedTransaction(signedTx.rawTransaction, async (error: any, txHash: string) => {
        if (error) {
          if (userData) {
            await updateUserTransactionStatus(userData.id, ContractState.FAILED)
          }

          response.status(502).send('Bad Gateway!')
          process.exit()
        } else {
          if (userData) {
            await updateUserTransactionHash(userData.id, txHash)
          } else {
            await addNewUser(
              txHash.toLowerCase(),
              web3.utils.toChecksumAddress(publicAddress),
              ContractState.PENDING,
              null
            )
          }

          response.status(200).send(txHash)
          process.exit()
        }
      })
    } catch (error) {
      response.status(502).send('Bad Gateway!')
    }
  })
  .onEvent(biconomy.ERROR, (error: any) => {
    response.status(502).send('Bad Gateway!')
  })
})

export const executeMetaTx = functions.https.onRequest(async (request, response) => {
  try {
    const {
      publicAddress,
      destinationAddress,
      signature,
      value,
      contractWalletAddress
    } = request.body
    const { authorization } = request.headers

    if (!authorization || !publicAddress || !destinationAddress || !signature || !value || !contractWalletAddress) {
      response.status(400).send('Bad Request!')
      process.exit()
    }

    if (authorization !== `Bearer ${configs.bearerAuthToken}`) {
      response.status(403).send('Invalid authorization!')
      process.exit()
    }

    if (!isValidAddress(publicAddress) || !isValidAddress(destinationAddress) || !isValidAddress(contractWalletAddress)) {
      response.status(400).send('Invalid address!')
      process.exit()
    }

    const isAllowed = await isAllowedToDoMeta(contractWalletAddress)
    if (!isAllowed) {
      response.status(400).send('Meta-transactions not allowed!')
      process.exit()
    }

    const userData = await fetchUserData(publicAddress)
    if (!userData) {
      response.status(400).send(`${shortenAddress(publicAddress)} user has not contract wallet!`)
      process.exit()
    }

    biconomy
    .onEvent(biconomy.READY, async () => {
      try {
        await whitelistAddresses([destinationAddress])

        const txParams = await getExecuteMethodTx(publicAddress, destinationAddress, signature, value, contractWalletAddress)
        const signedTx: any = await web3.eth.accounts.signTransaction(txParams, configs.signerPrivateKey).catch((error: any) => {
          response.status(417).send(error)
          process.exit()
        })

        await web3.eth.sendSignedTransaction(signedTx.rawTransaction, async (error: any, txHash: string) => {
          if (error) {
            response.status(502).send('Bad Gateway!')
            process.exit()
          } else {
            response.status(200).send(txHash)
            process.exit()
          }
        })
      } catch (error) {
        response.status(502).send('Bad Gateway!')
        process.exit()
      }
    })
    .onEvent(biconomy.ERROR, (error: any) => {
      throw error
    })
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})

export const getWalletInfo = functions.https.onRequest(async (request, response) => {
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

    const userData = await fetchUserData(publicAddress)
    if (userData) {
      let nonce = null
      let contract = null
      const transaction = userData.transaction

      if (userData.contract) {
        contract = userData.contract
        nonce = await getProxyContractNonce(contract)
      }

      response.status(200).send({
        nonce,
        contract,
        transaction
      })
      process.exit()
    }

    response.status(404).send(`${shortenAddress(publicAddress)} user has not contract wallet!`)
    process.exit()
  } catch (error) {
    response.status(502).send('Bad Gateway!')
    process.exit()
  }
})

// FOR DEMO PURPOSES ONLY
// This logic should be handled on the frontend/mobile side
// This cloud method should be removed after production release!
export const getSignature = functions.https.onRequest(async (request, response) => {
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
    let txGasEstimate:any = 0

    try {
        const gnosisSafeMasterCopy = new web3.eth.Contract(GnosisSafeAbi, configs.gnosisSafeAddress)
        const estimateData = gnosisSafeMasterCopy.methods.requiredTxGas(toAddress, valueWei, '0x0', operation).encodeABI()

        const estimateResponse = await web3.eth.call({
          to: proxyContractAddress,
          from: proxyContractAddress,
          data: estimateData,
          gasPrice: 0
        }).catch((error: any) => {
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
