const { SolanaTxValidator } = require('../lib/TxValidator');

describe("solanaTxValidator.isSplTxValid", () => {
  const solanaTxValidator = new SolanaTxValidator({
    web3: {},
    blockchain: {}
  })

  test('for different amounts in tx raw and json', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)
    tx.amount = 100
    const validResults = await solanaTxValidator.isSplTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transaction amount`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for valid Spl transaction', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = JSON.parse(blockchainTransaction.txRaw)

    const validResults = await solanaTxValidator.isSplTxValid(blockchainTransaction, tx)

    expect(validResults).toEqual({ valid: true })
  })

});
