const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const Web3 = require('@solana/web3.js')

describe("SolanaBlockchain.isSystemTxValid", () => {
  const hwAddress = 'CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58'
  const solanaBlockchain = new SolanaBlockchain({
    figmentApiKey: "figmeent_project_id",
    blockchainNetwork: 'solana_devnet',
  })
  let getRecentBlockhashSpy = jest.spyOn(Web3.Connection.prototype, "getRecentBlockhash")
  let getBalanceSpy = jest.spyOn(solanaBlockchain.web3, "getBalance")
  const lamportsPerSignature = 5000

  beforeEach(async () => {
    getRecentBlockhashSpy.mockReturnValueOnce({ feeCalculator: { lamportsPerSignature: lamportsPerSignature } })
  })

  test('for different amounts in tx raw and json', async () => {
    const blockchainTransaction = require('./fixtures/solanaSolBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)
    tx.amount = 100
    const validResults = await solanaBlockchain.isSystemTxValid(blockchainTransaction, tx, hwAddress)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transaction amount`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for zero amounts wallet balance was not verified', async () => {
    let blockchainTransaction = { ...require('./fixtures/solanaSolBlockchainTransaction').blockchainTransaction }
    let tx = JSON.parse(blockchainTransaction.txRaw)
    blockchainTransaction.amount = 0
    tx.amount = 0

    const validResults = await solanaBlockchain.isSystemTxValid(blockchainTransaction, tx, hwAddress)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Transfer amount ${blockchainTransaction.amount} is less then minimum  ${SolanaBlockchain.getMinimumSolTransferAmount()}`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for insufficient SOL balance to make tranfer', async () => {
    const blockchainTransaction = require('./fixtures/solanaSolBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)
    getBalanceSpy.mockImplementation(() => { return lamportsPerSignature });

    const validResults = await solanaBlockchain.isSystemTxValid(blockchainTransaction, tx, hwAddress)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`The Robo Wallet has insufficient SOL balance. Please top up the ${hwAddress}`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for valid System transaction', async () => {
    const blockchainTransaction = require('./fixtures/solanaSolBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)
    getBalanceSpy.mockImplementation(() => { return lamportsPerSignature + tx.amount });

    const validResults = await solanaBlockchain.isSystemTxValid(blockchainTransaction, tx, hwAddress)

    expect(validResults).toEqual({ valid: true })
  })

});
