const admin = require("firebase-admin");

admin.initializeApp()
const db = admin.firestore()
const mainCollection = `users`

exports.addNewUser = async (creationTx, wallet, status, contract, whitelisted) => {
  try {
    await db
      .collection(mainCollection)
      .add({
        creationTx,
        wallet,
        status,
        contract,
        whitelisted
      })

    return
  } catch (error) {
    console.log('DB::ADD_NEW_USER error =>', error)
    throw error
  }
}

exports.fetchUserData = async (userWallet) => {
  try {
    const result = await db
      .collection(mainCollection)
      .where('wallet', '==', userWallet)
      .get()

    if (result.docs && result.docs.length) {
      const record = result.docs[0]
      const data = record.data()
      const id = record.id
      const { status, creationTx, contract, whitelisted } = data

      return {
        id,
        status,
        contract,
        creationTx,
        whitelisted
      }
    }

    return null
  } catch (error) {
    console.log('DB::FETCH_USER_DATA error =>', error)
    throw error
  }
}

exports.updateUserTransactionStatus = async (userId, status) => {
  try {
    await db
      .collection(mainCollection)
      .doc(userId)
      .update({
        status
      })

    return
  } catch (error) {
    console.log('DB::UPDATE_USER_TRANSACTION_STATUS error =>', error)
    throw error
  }
}

exports.updateUserWhitelistedStatus = async (userId) => {
  try {
    await db
      .collection(mainCollection)
      .doc(userId)
      .update({
        whitelisted: true
      })

    return
  } catch (error) {
    console.log('DB::UPDATE_USER_TRANSACTION_STATUS error =>', error)
    throw error
  }
}


exports.updateUserTransactionHash = async (userId, creationTx) => {
  try {
    await db
      .collection(mainCollection)
      .doc(userId)
      .update({
        creationTx
      })

    return
  } catch (error) {
    console.log('DB::UPDATE_USER_TRANSACTION_HASH error =>', error)
    throw error
  }
}