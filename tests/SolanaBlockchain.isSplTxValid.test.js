const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain

describe("SolanaBlockchain.isSplTxValid", () => {
  const solanaBlockchain = new SolanaBlockchain({
    figmentApiKey: "figmeent_project_id",
    blockchainNetwork: 'solana_devnet',
  })

  test('for different amounts in tx raw and json', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)
    tx.amount = 100
    const validResults = await solanaBlockchain.isSplTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transaction amount`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for valid Spl transaction', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)

    const validResults = await solanaBlockchain.isSplTxValid(blockchainTransaction, tx)

    expect(validResults).toEqual({ valid: true })
  })

});
