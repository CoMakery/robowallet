const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')
const Web3 = require('@solana/web3.js')

describe("SolanaBlockchain.disableWallet", () => {
  const hwAddress = 'CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58'
  const recepientAddress = '8TEvCmV1R8gacJEN4kfwGiHk4FofNmRkvMtZAqDZ6fQJ'
  const tokenMintAddress = '91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g'
  const txHash = '2xu6HaySKadbeMozXnh69bP976uX78fhhw4LoWcd8U7FxKD99onMJUVyYzMGyAPSm61MxxnEC9z5rKtvVsVm9YpC'
  const solanaBlockchain = new SolanaBlockchain({
    figmentApiKey: "figmeent_project_id",
    blockchainNetwork: 'solana_devnet',
  })
  let sendTransactionSpy = jest.spyOn(solanaBlockchain, "sendTransaction")
  let getTokenBalanceSpy = jest.spyOn(solanaBlockchain, "getTokenBalance")
  let getSolBalanceSpy = jest.spyOn(solanaBlockchain, "getSolBalance")
  let getRecentBlockhashSpy = jest.spyOn(Web3.Connection.prototype, "getRecentBlockhash")

  beforeEach(async () => {
      getRecentBlockhashSpy.mockReturnValueOnce({feeCalculator: {lamportsPerSignature: 1000}})
  })

  describe('for disable wallet', () => {

    test('for empty disable values', async () => {
      const disableValues = {}

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(1)
      expect(validResults).toEqual({ tokensWithdrawalTx: {}, coinsWithdrawalTx: {} })
    })

    test('for zero token balance and undefined coin address', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress
      }
      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(3)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
      expect(validResults).toEqual({ tokensWithdrawalTx: { status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped" }, coinsWithdrawalTx: {} })
    })

    test('for error on send transaction', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress
      }
      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0000001"), balanceInBaseUnit: new BigNumber("100") })
      sendTransactionSpy.mockReturnValueOnce({ valid: false })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(3)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({ tokensWithdrawalTx: { status: "failed", txHash: null, message: "Error during withdraw tokens tx" }, coinsWithdrawalTx: {} })
    })

    test('for zero token and solana amount', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress,
        coinAddress: recepientAddress
      }
      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })
      getSolBalanceSpy.mockReturnValueOnce({ sol: new BigNumber("0.0"), lamports: new BigNumber("0") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(4)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
      expect(getSolBalanceSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({
        tokensWithdrawalTx: {
          status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped"
        },
        coinsWithdrawalTx: {
          status: "skipped", txHash: null, message: "SOL balance is <= 0.001, transaction skipped"
        }
      })
    })

    test('for zero token and solana amount only for fee', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress,
        coinAddress: recepientAddress
      }
      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })
      getSolBalanceSpy.mockReturnValueOnce({ sol: new BigNumber("0.000001000"), lamports: new BigNumber("1000") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(4)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(0)
      expect(getSolBalanceSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({
        tokensWithdrawalTx: {
          status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped"
        },
        coinsWithdrawalTx: {
          status: "skipped", txHash: null, message: "SOL balance is <= 0.001, transaction skipped"
        }
      })
    })

    test('for zero token and solana amount available to pay fee', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress,
        coinAddress: recepientAddress
      }

      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })
      sendTransactionSpy.mockReturnValue({ valid: true, transactionId: txHash })
      getSolBalanceSpy.mockReturnValueOnce({ sol: new BigNumber("0.000001001"), lamports: new BigNumber("1001") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(4)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
      expect(getSolBalanceSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({
        tokensWithdrawalTx: {
          status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped"
        },
        coinsWithdrawalTx: {
          status: "success", txHash: txHash, message: `Successfully sent Tx id: ${txHash}`
        }
      })
    })

    test('for zero token when transaction is failed for solana transfer', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress,
        coinAddress: recepientAddress
      }

      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("0.0"), balanceInBaseUnit: new BigNumber("0") })
      sendTransactionSpy.mockReturnValue({ valid: false, transactionId: null })
      getSolBalanceSpy.mockReturnValueOnce({ sol: new BigNumber("0.000001001"), lamports: new BigNumber("1001") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(4)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(1)
      expect(getSolBalanceSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({
        tokensWithdrawalTx: {
          status: "skipped", txHash: null, message: "Tokens balance is zero, transaction skipped"
        },
        coinsWithdrawalTx: {
          status: "failed", txHash: null, message: "Error during SOL withdraw tx"
        }
      })
    })

    test('for token and solana withdrawal', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        tokenContract: tokenMintAddress,
        coinAddress: recepientAddress
      }

      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("1.0"), balanceInBaseUnit: new BigNumber("1000000000") })
      sendTransactionSpy.mockReturnValue({ valid: true, transactionId: txHash })
      getSolBalanceSpy.mockReturnValueOnce({ sol: new BigNumber("0.000001001"), lamports: new BigNumber("1001") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(4)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(2)
      expect(getSolBalanceSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({
        tokensWithdrawalTx: {
          status: "success", txHash: txHash, message: `Successfully sent Tx id: ${txHash}`
        },
        coinsWithdrawalTx: {
          status: "success", txHash: txHash, message: `Successfully sent Tx id: ${txHash}`
        }
      })
    })

    test('for token and withdrawal with mintAddress value', async () => {
      const disableValues = {
        tokenAddress: recepientAddress,
        coinAddress: recepientAddress,
        mintAddress: tokenMintAddress
      }

      getTokenBalanceSpy.mockReturnValueOnce({ balance: new BigNumber("1.0"), balanceInBaseUnit: new BigNumber("1000000000") })
      sendTransactionSpy.mockReturnValue({ valid: true, transactionId: txHash })
      getSolBalanceSpy.mockReturnValueOnce({ sol: new BigNumber("0.000001001"), lamports: new BigNumber("1001") })

      const validResults = await solanaBlockchain.disableWallet(disableValues, hwAddress)

      expect.assertions(4)
      expect(getTokenBalanceSpy).toHaveBeenCalledTimes(1)
      expect(sendTransactionSpy).toHaveBeenCalledTimes(2)
      expect(getSolBalanceSpy).toHaveBeenCalledTimes(1)
      expect(validResults).toEqual({
        tokensWithdrawalTx: {
          status: "success", txHash: txHash, message: `Successfully sent Tx id: ${txHash}`
        },
        coinsWithdrawalTx: {
          status: "success", txHash: txHash, message: `Successfully sent Tx id: ${txHash}`
        }
      })
    })
  })
})
