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
    // It is necessary to cache values gotten from blockchain
    this.ethBalances = {}
    this.tokenBalances = {}
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
    const newWallet = Web3.Keypair.generate()
    const address = newWallet.publicKey.toString()
    const keys = { publicKey: newWallet.publicKey, privateKey: newWallet.secretKey }

    return new HotWallet(this.blockchainNetwork, address, keys)
  }

  async getEthBalance(hotWalletAddress) {
    await this.connect()
    const blockchainBalance = await this.chain.fetchBalance(hotWalletAddress, chainjs.HelpersEthereum.toEthereumSymbol('eth'))
    this.ethBalances[hotWalletAddress] = new BigNumber(blockchainBalance.balance || 0)

    return this.ethBalances[hotWalletAddress]
  }

  async enoughCoinBalanceToSendTransaction(hotWalletAddress) {
    const balance = await this.getEthBalance(hotWalletAddress)
    return balance.isGreaterThan(new BigNumber(0.001))
  }

  async tokenContract(tokenAddress) {
    await this.connect()

    return new this.chain.web3.eth.Contract(this.balanceAbi(), tokenAddress)
  }

  async getTokenBalance(hotWalletAddress) {
    await this.connect()
    // Chainjs version does not work for some reason so I implemented custom check using web3
    // const tokenBalance = await this.chain.fetchBalance(hotWalletAddress, chainjs.HelpersEthereum.toEthereumSymbol(this.envs.ethereumTokenSymbol), this.envs.ethereumContractAddress)

    let contractAddress = this.envs.ethereumContractAddress.toString()

    // For Lockup contract we check balance of erc20 contract
    if (this.envs.ethereumTokenType == 'token_release_schedule') {
      contractAddress = this.envs.ethereumApprovalContractAddress.toString()
    }

    const contract = await this.tokenContract(contractAddress)
    const balances = { balance: new BigNumber(0), balanceInBaseUnit: new BigNumber(0) }
    const balanceRes = await contract.methods.balanceOf(hotWalletAddress).call()
    const decimals = await contract.methods.decimals().call()

    if (balanceRes && decimals) {
      const divisor = new BigNumber(10).pow(decimals)
      balances["balance"] = new BigNumber(balanceRes).div(divisor)
      balances["balanceInBaseUnit"] = new BigNumber(balanceRes)

      this.tokenBalances[hotWalletAddress] = balances
    }
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

  async sendTransaction(transaction, hotWallet) {
    await this.connect()

    const txn = JSON.parse(transaction.txRaw || "{}")

    if (txn.contract) {
      txn.data = chainjs.HelpersEthereum.generateDataFromContractAction(txn.contract)
    }

    return await this.sendEIP1559Tx(txn, hotWallet)
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
