import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

export const addNewUser = async (transaction, wallet, status, contract) => {
  try {
    await db
      .collection('usersContracts')
      .add({
        transaction,
        wallet,
        status,
        contract
      })

    return
  } catch (error) {
    console.log('DB::ADD_NEW_USER error =>', error)
    throw error
  }
}

export const fetchUserData = async (publicAddress) => {
  try {
    const result = await db
      .collection('usersContracts')
      .where('wallet', '==', publicAddress)
      .get()

    if (result.docs && result.docs.length) {
      const record = result.docs[0]
      const data = record.data()
      const id = record.id
      const { status, transaction, contract } = data

      return {
        id,
        status,
        contract,
        transaction
      }
    }

    return null
  } catch (error) {
    console.log('DB::FETCH_USER_DATA error =>', error)
    throw error
  }
}

export const updateUserTransactionStatus = async (userId, status) => {
  try {
    await db
      .collection('usersContracts')
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

export const updateUserTransactionHash = async (userId, transaction) => {
  try {
    await db
      .collection('usersContracts')
      .doc(userId)
      .update({
        transaction
      })

    return
  } catch (error) {
    console.log('DB::UPDATE_USER_TRANSACTION_HASH error =>', error)
    throw error
  }
}