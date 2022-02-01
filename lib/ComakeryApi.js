const JSONbig = require("json-bigint")
const axios = require("axios")
const { default: BigNumber } = require("bignumber.js")

class ComakeryApi {
  constructor(envs) {
    this.envs = envs
  }

  async registerHotWallet(wallet) {
    const registerHotWalletUrl = `${this.envs.comakeryServerUrl}/api/v1/projects/${this.envs.projectId}/hot_wallet_addresses`
    const params = { body: { data: { hot_wallet: { address: wallet.address } } } }
    const config = { headers: { "API-Transaction-Key": this.envs.projectApiKey } }

    try {
      return await axios.post(registerHotWalletUrl, params, config)
    } catch (error) {
      this.logError('registerHotWallet', error)
      return {}
    }
  }

  async disableHotWallet(message, status) {
    const disableHotWalletUrl = `${this.envs.comakeryServerUrl}/api/v1/projects/${this.envs.projectId}/hot_wallet_addresses/1`
    const params = { body: { data: { wallet_disable: { message: message, status: status } } } }
    const config = { headers: { "API-Transaction-Key": this.envs.projectApiKey } }

    try {
      return await axios.put(disableHotWalletUrl, params, config)
    } catch (error) {
      this.logError('disableHotWallet', error)
      return {}
    }
  }

  async getNextTransactionToSign(hotWalletAddress) {
    const blockchainTransactionsUrl = `${this.envs.comakeryServerUrl}/api/v1/projects/${this.envs.projectId}/blockchain_transactions`
    const params = { body: { data: { transaction: { source: hotWalletAddress } } } }
    const config = { headers: { "API-Transaction-Key": this.envs.projectApiKey } }
    try {
      let res = await axios({
        method: 'post',
        url: blockchainTransactionsUrl,
        headers: config.headers,
        data: params,
        transformResponse: [data => data]
      })

      if (res.headers['robowallet-disable']) {
        return { disableWalletWith: JSON.parse(res.headers['robowallet-disable']) }
      }
      return res.status == 201 ? JSONbig.parse(res.data) : {}
    } catch (error) {
      this.logError('getNextTransactionToSign', error)
      return {} // transaction will be in pending status on server side
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async updateTransactionHash(blockchainTransaction) {
    const blockchainTransactionsUrl = `${this.envs.comakeryServerUrl}/api/v1/projects/${this.envs.projectId}/blockchain_transactions/${blockchainTransaction.id}`
    const params = { body: { data: { transaction: { tx_hash: blockchainTransaction.txHash } } } }
    const config = { headers: { "API-Transaction-Key": this.envs.projectApiKey } }

    while (true) {
      try {
        const res = await axios.put(blockchainTransactionsUrl, params, config)
        if (res.status == 200) {
          console.log("Transaction hash was successfully updated")
          return res.data
        } else {
          console.log('Unexpected result on update transaction hash')
        }
      } catch (error) {
        this.logError('updateTransactionHash', error)
      }
      await this.sleep(10 * 1000) // wait 10 seconds for next try in order to not generate a lot of requests to server
    }
  }

  async cancelTransaction(blockchainTransaction, errorMessage, status, switchHWToManualMode) {
    const blockchainTransactionsUrl = `${this.envs.comakeryServerUrl}/api/v1/projects/${this.envs.projectId}/blockchain_transactions/${blockchainTransaction.id}`
    let transactionParams = { status_message: errorMessage }
    if (status == "failed") { transactionParams["failed"] = true }
    if (switchHWToManualMode) { transactionParams["switch_hot_wallet_to_manual_mode"] = true }
    const params = { body: { data: { transaction: transactionParams } } }
    const config = { data: params, headers: { "API-Transaction-Key": this.envs.projectApiKey } }

    try {
      const res = await axios.delete(blockchainTransactionsUrl, config)
      if (res.status == 200) {
        console.log(`The transaction has been marked as ${status}`)
        return res.data
      } else {
        return {}
      }
    } catch (error) {
      this.logError('cancelTransaction', error)
      return {}
    }
  }

  logError(functionName, error) {
    console.error(`${functionName} API call failed with:\n`)

    if (error.response) {
      console.error(
        `${error.response.status} (${error.response.statusText}) data:\n`,
        error.response.data
      )
    } else {
      console.error(`${functionName} produced an unknown error on API call`)
    }
  }
}
exports.ComakeryApi = ComakeryApi
