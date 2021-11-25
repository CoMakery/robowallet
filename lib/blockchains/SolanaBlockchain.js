
const BigNumber = require('bignumber.js')
const HotWallet = require("../HotWallet").HotWallet
const Web3 = require('@solana/web3.js')
class SolanaBlockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    const endpoint = this.endpointsByNetwork(this.blockchainNetwork)
    this.web3 = new Web3.Connection(endpoint, 'confirmed')
  }

  mainnetEndpoints() {
    return `https://solana--mainnet.datahub.figment.io/apikey/${this.envs.figmentApiKey}`
  }

  devnetEndpoints() {
    return `https://solana--devnet.datahub.figment.io/apikey/${this.envs.figmentApiKey}`
  }

  endpointsByNetwork(network) {
    switch (network) {
      case 'solana':
        return this.mainnetEndpoints()
      case 'solana_devnet':
        return this.devnetEndpoints()
      default:
        console.error("Unknown or unsupported network")
    }
  }

  connectionConfig() {
    return {
      commitment: 'finalized',
      disableRetryOnRateLimit: false,
    }
  }

  async generateNewWallet() {
    let newWallet
    let address = ''

    while (address.length != 44) {
      newWallet = Web3.Keypair.generate()
      address = newWallet.publicKey.toString()
    }
    const privateKey = Buffer.from(newWallet.secretKey).toString('hex')
    const keys = { publicKey: address, privateKey: privateKey }

    return new HotWallet(this.blockchainNetwork, address, keys)
  }

  async getSolBalance(hotWalletAddress) {
    const publickKey = new Web3.PublicKey(hotWalletAddress)
    const lamportsBalanceResponse = await this.web3.getBalance(publickKey)
    const lamportsBalance = new BigNumber(lamportsBalanceResponse)
    const balances = { lamports: new BigNumber(0), sol: new BigNumber(0) }

    if (lamportsBalance.isGreaterThan(BigNumber(0))) {
      balances['lamports'] = lamportsBalance
      balances['sol'] = lamportsBalance.div(BigNumber(Web3.LAMPORTS_PER_SOL))
    }
    return balances
  }

  async enoughCoinBalanceToSendTransaction(hotWalletAddress) {
    const solBalance = (await this.getSolBalance(hotWalletAddress)).sol
    return solBalance.isGreaterThan(new BigNumber(0.001))
  }

  async tokenContract(tokenAddress) {
    return new this.chain.web3.eth.Contract(this.balanceAbi(), tokenAddress)
  }

  async getTokenBalance(hotWalletAddress) {
    const walletPubKey = new Web3.PublicKey(hotWalletAddress)
    const tokenPubKey = new Web3.PublicKey(this.envs.solanaTokenAddress)
    const balances = { balance: new BigNumber(0), balanceInBaseUnit: new BigNumber(0) }

    try {
      const tokenAccountsResponse = await this.web3.getTokenAccountsByOwner(
        walletPubKey,
        { mint: tokenPubKey }
      )

      if (tokenAccountsResponse.value.length) {
        const tokenAccountsPubKeys = tokenAccountsResponse.value.map(val => val.pubkey)
        for (var i = 0; i < tokenAccountsPubKeys.length; i++) {
          const balanceResponse = await this.web3.getTokenAccountBalance(tokenAccountsPubKeys[i])
          const uiAmount = new BigNumber(balanceResponse.value.uiAmount)
          const baseAmount = new BigNumber(balanceResponse.value.amount)

          balances["balance"] = balances["balance"].plus(uiAmount)
          balances["balanceInBaseUnit"] = balances["balanceInBaseUnit"].plus(baseAmount)
        }
      }

      return balances
    } catch (err) {
      console.error(err.message)
      console.error(err.stack)
      return balances
    }
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }

    try {
      const txn = JSON.parse(blockchainTransaction.txRaw || "{}")

      // SOL transfer
      if (txn.type == "Blockchain::Solana::Tx::SystemProgram::Transfer") {
        // validate enough SOL
        const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)
        if (amountInBaseUnit.isGreaterThan(new BigNumber(0))) {
          const lamportsBalance = await this.getSolBalance(hotWalletAddress)

          if (lamportsBalance.lamports.isLessThan(amountInBaseUnit)) {
            const errorMessage = `The Robo Wallet has insufficient SOL balance. Please top up the ${hotWalletAddress}`
            console.log(errorMessage)
            return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
          }
        }
      // Token transfers (SPL or contracts)
      } else {
        // validate enough tokens
        const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)
        if (amountInBaseUnit.isGreaterThan(new BigNumber(0))) {
          const tokenBalance = await this.getTokenBalance(hotWalletAddress)

          if (tokenBalance.balanceInBaseUnit.isLessThan(amountInBaseUnit)) {
            const errorMessage = `The Robo Wallet has insufficient tokens. Please top up the ${hotWalletAddress}`
            console.log(errorMessage)
            return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
          }
        }
      }

      return { valid: true }
    } catch (err) {
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}`, switchHWToManualMode: true }
    }
  }

  async sendTransaction(blockchainTransaction, hotWallet) {
    const SolanaTxHelper = (await import('../SolanaTxHelper.mjs')).default // Dynamic import
    const txn = JSON.parse(blockchainTransaction.txRaw || "{}")
    const helper = new SolanaTxHelper(blockchainTransaction.network)

    const transaction = await helper.create(txn)

    if (transaction) {
      try {
        const signature = await Web3.sendAndConfirmTransaction(this.web3, transaction, [hotWallet.klass.keyPair])
        console.log("Submitted transaction " + signature + ", awaiting confirmation")

        await this.web3.confirmTransaction(signature)
        console.log("Transaction " + signature + " confirmed")

        return { transactionId: signature, valid: true }
      } catch (err) {
        console.error("Something went wrong during transaction transfer")
        console.error(err)
        console.error(err.stack)
        return { valid: false, markAs: "failed", error: err.message }
      }
    }
  }

  async disableWallet(withdrawalAddresses, hotWallet) {
    console.log("Robo wallet is going to be disabled...")

    const result = { tokensWithdrawalTx: {}, coinsWithdrawalTx: {} }

    if (withdrawalAddresses.tokenAddress) {
      const tokenBalance = await this.getTokenBalance(hotWallet.address)

      if (tokenBalance.balanceInBaseUnit.isGreaterThan(new BigNumber(0))) {
        let contractAddress = this.envs.ethereumContractAddress.toString()

        // For Lockup contract we check balance of erc20 contract
        if (this.envs.ethereumTokenType == 'token_release_schedule') {
          contractAddress = this.envs.ethereumApprovalContractAddress.toString()
        }

        const tokensAmount = tokenBalance.balanceInBaseUnit.toString()
        const txObject = this.withdrawTokensTx(hotWallet.address, contractAddress, withdrawalAddresses.tokenAddress, tokensAmount)
        console.log(`Sending ${tokensAmount} tokens to ${withdrawalAddresses.tokenAddress}`)

        const tx = await this.sendTransaction(txObject, hotWallet)

        if (typeof tx.valid == 'undefined' || tx.valid) {
          const msg = `Successfully sent Tx id: ${tx.transactionId}`
          console.log(msg)
          result.tokensWithdrawalTx = { status: "success", txHash: tx.transactionId, message: msg }
        } else {
          const msg = "Error during withdraw tokens tx"
          console.error(msg)
          result.tokensWithdrawalTx = { status: "failed", txHash: null, message: msg }
        }
      } else {
        result.tokensWithdrawalTx = { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" }
      }
    }

    if (withdrawalAddresses.coinAddress && result.tokensWithdrawalTx.status !== "failed") {
      const coinBalance = await this.getEthBalance(hotWallet.address)

      if (coinBalance.isGreaterThan(new BigNumber(0.02))) {
        const web3 = this.web3
        const maxFeePerGas = new BigNumber(web3.utils.toWei(this.envs.ethereumMaxFeePerGas, 'gwei')).multipliedBy(21000)
        const coinsAmount = new BigNumber(web3.utils.toWei(coinBalance.toString(), 'ether')).minus(maxFeePerGas)
        const txObject = this.withdrawCoinsTx(hotWallet.address, withdrawalAddresses.coinAddress, coinsAmount)

        console.log(`Sending ${coinsAmount} coins to ${withdrawalAddresses.coinAddress}`)
        const tx = await this.sendTransaction(txObject, hotWallet)

        if (typeof tx.valid == 'undefined' || tx.valid) {
          const msg = `Successfully sent Tx id: ${tx.transactionId}`
          console.log(msg)
          result.coinsWithdrawalTx = { status: "success", txHash: tx.transactionId, message: msg }
        } else {
          const msg = "Error during withdraw ETH tx"
          console.error(msg)
          result.coinsWithdrawalTx = { status: "failed", txHash: null, message: msg }
        }
      } else {
        result.coinsWithdrawalTx = { status: "skipped", txHash: null, message: "ETH balance is <= 0.001, transaction skipped" }
      }
    }

    return result
  }
}
exports.SolanaBlockchain = SolanaBlockchain
