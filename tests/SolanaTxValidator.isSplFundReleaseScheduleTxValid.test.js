const { SolanaTxValidator } = require('../lib/TxValidator');

describe("solanaTxValidator.isSplFundReleaseScheduleTxValid", () => {
  const solanaTxValidator = new SolanaTxValidator({
    web3: {},
    blockchain: {}
  })

  test('for different amounts in tx raw and json', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = {...require('./fixtures/solanaSplBlockchainTransaction').txFundReleaseSchedule}
    tx.amount = 100

    const validResults = await solanaTxValidator.isSplFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transaction amount`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect scheduleId', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = {...require('./fixtures/solanaSplBlockchainTransaction').txFundReleaseSchedule}
    tx.scheduleId = -1

    const validResults = await solanaTxValidator.isSplFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Unsupported fund release scheduleId parameter: ${tx.scheduleId}`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect cancalable_by accounts count', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = {...require('./fixtures/solanaSplBlockchainTransaction').txFundReleaseSchedule}
    tx.cancelableBy = Array(11).fill(tx.from)

    const validResults = await solanaTxValidator.isSplFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Cancalable by accounts more than 10: ${tx.cancelableBy.length}`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for valid Spl fund release schedule transaction', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    let tx = {...require('./fixtures/solanaSplBlockchainTransaction').txFundReleaseSchedule}

    const validResults = await solanaTxValidator.isSplFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults).toEqual({ valid: true })
  })

});
