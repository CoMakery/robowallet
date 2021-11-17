const BigNumber = require('bignumber.js')
const HotWallet = require("../HotWallet").HotWallet
const Web3 = require('@solana/web3.js')
const TextDecoder = require('text-encoding').TextDecoder

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
    // TODO: Implement me
    return balances
  }

  async positiveTokenBalance(hotWalletAddress) {
    const tokenBalance = await this.getTokenBalance(hotWalletAddress)
    return tokenBalance.balanceInBaseUnit.isGreaterThan(new BigNumber(0))
  }

  async isTransactionValid(blockchainTransaction, hotWalletAddress) {
    if (typeof blockchainTransaction.txRaw !== 'string') { return { valid: false } }

    try {
      // validate enough tokens
      const amountInBaseUnit = new BigNumber(blockchainTransaction.amount)
      if (amountInBaseUnit.isGreaterThan(new BigNumber(0))) {
        const tokenBalance = await this.getTokenBalance(hotWalletAddress)

        if (tokenBalance.balanceInBaseUnit.isLessThan(amountInBaseUnit)) {
          const errorMessage = `The Hot Wallet has insufficient tokens. Please top up the ${hotWalletAddress}`
          console.log(errorMessage)
          return { valid: false, markAs: "cancelled", error: errorMessage, switchHWToManualMode: true }
        }
      }

      return { valid: true }
    } catch (err) {
      return { valid: false, markAs: "failed", error: `Unknown error: ${err}`, switchHWToManualMode: true }
    }
  }

  async createTransferTransaction(hotWallet) {
    if (!hotWallet.klass.solanaPublicKey) { return }

    let transaction = new Web3.Transaction().add(
      Web3.SystemProgram.transfer({
        fromPubkey: hotWallet.klass.solanaPublicKey,
        toPubkey: new Web3.PublicKey("7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i"),
        lamports: 100,
      })
    )

    transaction.feePayer = hotWallet.klass.solanaPublicKey;
    transaction.recentBlockhash = (await this.web3.getRecentBlockhash()).blockhash

    return transaction;
  }

  async sendTransaction(blockchainTransaction, hotWallet) {
    const txn = JSON.parse(blockchainTransaction.txRaw || "{}")

    // TODO: Apply adapter to convert tx

    const transaction = await this.createTransferTransaction(hotWallet)

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

        sleep(10000)
        console.log("Trying to resend the same transaction...")
        this.sendTransaction(blockchainTransaction, hotWallet)
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
