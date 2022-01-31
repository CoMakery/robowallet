const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')
const Web3 = require('@solana/web3.js')

describe("SolanaBlockchain.isTransactionValid", () => {
  const hwAddress = 'CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58'
  const solanaBlockchain = new SolanaBlockchain({
    figmentApiKey: "figmeent_project_id",
    blockchainNetwork: 'solana_devnet',
  })
  let getRecentBlockhashSpy = jest.spyOn(Web3.Connection.prototype, "getRecentBlockhash")

  beforeEach(async () => {
    getRecentBlockhashSpy.mockReturnValueOnce({ feeCalculator: { lamportsPerSignature: 5000 } })
  })

  describe("for common problems", () => {
    test('for unknown transaction type', async () => {
      const SplblockchainTransactablesBatch = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransactablesBatch
      const unknowTxType = "Blockchain::Solana::Tx::AnyUnknownText"
      const transcation = {
        txRaw: JSON.stringify({
          type: unknowTxType
        }), 
        blockchainTransactables: SplblockchainTransactablesBatch
      }
      const validResults = await solanaBlockchain.isTransactionValid(transcation, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual(`The Robo Wallet doesn't support transaction type: ${unknowTxType}`)
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for empty transactable', async () => {
      const blockchainTransaction = {... require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction }
      blockchainTransaction.blockchainTransactables = []  

      const validResults = await solanaBlockchain.isTransactionValid(blockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual("Empty transactables")
      expect(validResults.switchHWToManualMode).toBe(true)
    })
  })

  describe("for SPL token transfer", () => {
    const SplblockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const SplTxRaw = require('./fixtures/solanaSplBlockchainTransaction').txRaw

    test('for valid blockchainTransaction', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.00000001"), balanceInBaseUnit: new BigNumber("10") })

      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(true)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for incorrect txRaw', async () => {
      const bt = { ...SplblockchainTransaction }
      bt["txRaw"] = null

      const validResults = await solanaBlockchain.isTransactionValid(bt, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for not enough tokens', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({ balance: new BigNumber("0.0000000004"), balanceInBaseUnit: new BigNumber("4") })

      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual("The Robo Wallet has insufficient tokens. Please top up the CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58")
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for unknown error', async () => {
      jest.spyOn(solanaBlockchain, "getTokenBalance").mockReturnValueOnce({})

      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("failed")
      expect(validResults.error).toEqual("Unknown error: TypeError: Cannot read property 'isLessThan' of undefined")
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for different contract address and token mint adress', async () => {
      SplblockchainTransaction.contractAddress = 'BP225Qq7uxbaXybXkicUehkfeKkk6a1JcFwcX4Laem1t'
      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual(`The Robo Wallet requires equal address for SPL transfers. Please check ${SplblockchainTransaction.contractAddress}, ${SplTxRaw.tokenMintAddress}`)
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for different ammounts', async () => {
      SplblockchainTransaction.amount = 100
      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transaction amount`)
      expect(validResults.switchHWToManualMode).toBe(true)
    })
  })

  describe("for SOL transfer", () => {
    const SolBlockchainTransaction = require('./fixtures/solanaSolBlockchainTransaction').blockchainTransaction

    test('for valid blockchainTransaction', async () => {
      jest.spyOn(solanaBlockchain, "getSolBalance").mockReturnValueOnce({ sol: new BigNumber("0.00001"), lamports: new BigNumber("10000") })

      const validResults = await solanaBlockchain.isTransactionValid(SolBlockchainTransaction, hwAddress)

      expect(validResults.valid).toBe(true)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for incorrect txRaw', async () => {
      const bt = { ...SolBlockchainTransaction }
      bt["txRaw"] = null

      const validResults = await solanaBlockchain.isTransactionValid(bt, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe(undefined)
      expect(validResults.error).toBe(undefined)
      expect(validResults.switchHWToManualMode).toBe(undefined)
    })

    test('for not enough tokens', async () => {
      jest.spyOn(solanaBlockchain, "getSolBalance").mockReturnValueOnce({ sol: new BigNumber("0.000005000"), lamports: new BigNumber("5000") })

      const validResults = await solanaBlockchain.isTransactionValid(SolBlockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual("The Robo Wallet has insufficient SOL balance. Please top up the CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58")
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for unknown error', async () => {
      jest.spyOn(solanaBlockchain, "getSolBalance").mockReturnValueOnce({})

      const validResults = await solanaBlockchain.isTransactionValid(SolBlockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("failed")
      expect(validResults.error).toEqual("Unknown error: TypeError: Cannot read property 'isLessThan' of undefined")
      expect(validResults.switchHWToManualMode).toBe(true)
    })
  })
  describe('SPL batch transfer', () => {
    let SplblockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const SplBatchTxRaw = require('./fixtures/solanaSplBlockchainTransaction').txBatchRaw
    const SplblockchainTransactablesBatch = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransactablesBatch
    let SplTxRaw = require('./fixtures/solanaSplBlockchainTransaction').txRaw

    test('for transaction data is not inside array', async () => {
      SplTxRaw.type = SplBatchTxRaw.type
      SplblockchainTransaction.txRaw = JSON.stringify(SplTxRaw)
      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for different size of transactable and transactions', async () => {
      SplblockchainTransaction.txRaw = JSON.stringify(SplBatchTxRaw)
      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
      expect(validResults.switchHWToManualMode).toBe(true)
    })

    test('for total amount is different than sum of transactions', async () => {
      SplblockchainTransaction.txRaw = JSON.stringify(SplBatchTxRaw)
      SplblockchainTransaction.blockchainTransactables = SplblockchainTransactablesBatch
      const validResults = await solanaBlockchain.isTransactionValid(SplblockchainTransaction, hwAddress)
      expect(validResults.valid).toBe(false)
      expect(validResults.markAs).toBe("cancelled")
      expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transactions sum`)
      expect(validResults.switchHWToManualMode).toBe(true)
    })
  })
});
