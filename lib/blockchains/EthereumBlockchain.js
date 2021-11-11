const chainjs = require("@open-rights-exchange/chainjs")
const BigNumber = require('bignumber.js')
const HotWallet = require("../HotWallet").HotWallet
const Web3 = require('web3')
const Common = require('@ethereumjs/common')
const FeeMarketEIP1559Transaction = require('@ethereumjs/tx').FeeMarketEIP1559Transaction

class EthereumBlockchain {
  constructor(envs) {
    this.envs = envs
    this.blockchainNetwork = envs.blockchainNetwork
    const endpoints = this.endpointsByNetwork(this.blockchainNetwork)
    const chainOptions = this.chainOptions(this.blockchainNetwork)
    this.chain = new chainjs.ChainFactory().create(chainjs.ChainType.EthereumV1, endpoints, chainOptions)
    this.web3 = new Web3(new Web3.providers.HttpProvider(`https://${this.chainName}.infura.io/v3/${this.envs.infuraProjectId}`))
    // It is necessary to cache values gotten from blockchain
    this.ethBalances = {}
    this.tokenBalances = {}
  }

  get chainName() {
    switch (this.blockchainNetwork) {
      case 'ethereum':
        return 'mainnet'
      case 'ethereum_ropsten':
        return 'ropsten'
      case 'ethereum_rinkeby':
        return 'rinkeby'
      default:
        console.error("Unknown or unsupported network: ", this.blockchainNetwork)
    }
  }

  mainnetEndpoints() {
    return [
      {
        url: `https://mainnet.infura.io/v3/${this.envs.infuraProjectId}`
      }
    ]
  }

  ropstenEndpoints() {
    return [
      {
        url: `https://ropsten.infura.io/v3/${this.envs.infuraProjectId}`
      }
    ]
  }

  rinkebyEndpoints() {
    return [
      {
        url: `https://rinkeby.infura.io/v3/${this.envs.infuraProjectId}`
      }
    ]
  }

  endpointsByNetwork(network) {
    switch (network) {
      case 'ethereum':
        return this.mainnetEndpoints()
      case 'ethereum_ropsten':
        return this.ropstenEndpoints()
      case 'ethereum_rinkeby':
        return this.rinkebyEndpoints()

      default:
        console.error("Unknown or unsupported network")
    }
  }

  mainnetChainOptions() {
    return {
      chainForkType: {
        chainName: 'mainnet',
        hardFork: 'istanbul',
      },
      defaultTransactionSettings: {
        maxFeeIncreasePercentage: 20,
        executionPriority: chainjs.Models.TxExecutionPriority.Fast,
      },
    }
  }

  ropstenChainOptions() {
    return {
      chainForkType: {
        chainName: 'ropsten',
        hardFork: 'istanbul',
      },
      defaultTransactionSettings: {
        maxFeeIncreasePercentage: 20,
        executionPriority: chainjs.Models.TxExecutionPriority.Fast,
      },
    }
  }

  rinkebyChainOptions() {
    return {
      chainForkType: {
        chainName: 'rinkeby',
        hardFork: 'istanbul',
      },
      defaultTransactionSettings: {
        maxFeeIncreasePercentage: 20,
        executionPriority: chainjs.Models.TxExecutionPriority.Fast,
      },
    }
  }

  chainOptions(network) {
    switch (network) {
      case 'ethereum':
        return this.mainnetChainOptions()
      case 'ethereum_ropsten':
        return this.ropstenChainOptions()
      case 'ethereum_rinkeby':
        return this.rinkebyChainOptions()
      default:
        console.error("Unknown or unsupported network")
    }
  }

  createAccountOptions() {
    return {
      newKeysOptions: {
        password: 'hot_wallet_ethereum_pwd',
        salt: 'hot_wallet_ethereum_salt'
      }
    }
  }

  balanceAbi() {
    return [{
      inputs: [
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'balanceOf',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    }, {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [
        {
          name: 'decimals',
          type: 'uint8',
        },
      ],
      payable: false,
      type: 'function',
    }]
  }

  approveAbi() {
    return [
      {
        constant: false,
        inputs: [
          {
            name: '_spender',
            type: 'address'
          },
          {
            name: '_value',
            type: 'uint256'
          }
        ],
        name: 'approve',
        outputs: [
          {
            name: '',
            type: 'bool'
          }
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ]
  }

  maxPossibleAmount() {
    return '115792089237316195423570985008687907853269984665640564039457584007913129639935'
  }

  approveTxObject(hotWalletAddress, contractAddress, approvalContractAddress) {
    return {
      from: hotWalletAddress,
      to: contractAddress,
      contract: {
        abi: this.approveAbi(),
        method: 'approve',
        parameters: [approvalContractAddress, this.maxPossibleAmount()]
      }
    }
  }

  withdrawTokensTx(hotWalletAddress, contractAddress, withdrawalAddress, tokensAmount) {
    return {
      txRaw: JSON.stringify({
        from: hotWalletAddress,
        to: contractAddress,
        value: "0x0",
        contract: {
          abi: [{
            constant: false,
            inputs: [{ name: "_to", type: "address" }, { name: "_value", type: "uint256" }],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            payable: false,
            stateMutability: "nonpayable",
            type: "function"
          }],
          method: "transfer",
          parameters:[withdrawalAddress, tokensAmount]
        }
      })
    }
  }

  withdrawCoinsTx(hotWalletAddress, withdrawalAddress, coinsAmount) {
    return {
      txRaw: JSON.stringify({
        from: hotWalletAddress,
        to: withdrawalAddress,
        value: this.web3.utils.toHex(coinsAmount),
      })
    }
  }

  async connect() {
    if (!this.chain.isConnected) {
      await this.chain.connect()
    }
  }

  async generateNewWallet() {
    await this.connect()

    const createAccount = this.chain.new.CreateAccount(this.createAccountOptions())
    await createAccount.generateKeysIfNeeded()

    return new HotWallet(this.blockchainNetwork, createAccount.accountName, createAccount.generatedKeys)
  }

  async sendEIP1559Tx(txn, hotWallet) {
    const web3 = this.web3

    try {
      txn.gasLimit = await web3.eth.estimateGas(txn)
      txn.maxPriorityFeePerGas = web3.utils.toHex(web3.utils.toWei(this.envs.ethereumMaxPriorityFeePerGas, 'gwei' ))
      txn.maxFeePerGas =  web3.utils.toHex(web3.utils.toWei(this.envs.ethereumMaxFeePerGas, 'gwei' ))
      txn.nonce = await web3.eth.getTransactionCount(hotWallet.address, 'pending')

      const common = new Common.default({ chain : this.chainName, hardfork : 'london' })
      const tx = FeeMarketEIP1559Transaction.fromTxData(txn, { common })
      const signedTx = tx.sign(Buffer.from(hotWallet.privateKey.slice(2), 'hex'))
      const serializedTx = signedTx.serialize().toString('hex')

      return await new Promise(async (resolve) => {
        await web3.eth.sendSignedTransaction('0x' + serializedTx)
          .once('transactionHash', txHash => {
            console.log('transactionHash:', txHash)
          })
          .on('confirmation', (confirmationNumber, receipt) => {
            console.log('confirmations:', receipt.transactionHash, confirmationNumber, receipt)
            if (confirmationNumber > 1) {
              resolve({ transactionId: receipt.transactionHash })
            }
          })
          .once('error', error => {
            console.error(error)
            if (error.message.includes('insufficient funds')) {
              resolve({ valid: false, markAs: "cancelled", error: error })
            } else {
              resolve({ valid: false, markAs: "failed", error: error })
            }
          })
      })
    } catch (error) {
      console.error(error)
      return { valid: false, markAs: "failed", error: error }
    }
  }

  async approveContractTransactions(hotWallet, contractAddress, approvalContractAddress) {
    await this.connect()

    const txn = this.approveTxObject(hotWallet.address, contractAddress, approvalContractAddress)
    txn.data = chainjs.HelpersEthereum.generateDataFromContractAction(txn.contract)

    return await this.sendEIP1559Tx(txn, hotWallet)
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
exports.EthereumBlockchain = EthereumBlockchain
