const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')
const { SolanaTxValidator } = require('../lib/TxValidator');

describe("SolanaTxValidator.isSplBatchFundReleaseScheduleTxValid", () => {
  const solanaBlockchain = new SolanaBlockchain({
    alchemyApiKey: "alchemy_project_id",
    blockchainNetwork: 'solana_devnet',
  })

  const solanaTxValidator = new SolanaTxValidator({
    web3: solanaBlockchain.web3,
    blockchain: solanaBlockchain
  })

  test('for not equal transactions count in table and in raw', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }

    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for total amount is not equal to transactions sum', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }
    const blockchainTransactablesBatch = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransactablesBatch
    blockchainTransaction.blockchainTransactables = blockchainTransactablesBatch

    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transactions sum`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for valid spl batch fund release schedule transactions', async () => {
    let blockchainTransaction = { ...require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction }
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }
    const blockchainTransactablesBatch = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransactablesBatch
    blockchainTransaction.blockchainTransactables = blockchainTransactablesBatch
    blockchainTransaction.amount = BigNumber.sum.apply(null, tx.amount)

    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults).toEqual({ valid: true })
  })

  test('for incorrect count of to accounts', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }

    const elem = tx.to.pop()
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)
    tx.to.push(elem)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect count of amounts', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }

    const elem = tx.amount.pop()
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)
    tx.amount.push(elem)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect count of commencementTimestamp', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }

    const elem = tx.commencementTimestamp.pop()
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)
    tx.commencementTimestamp.push(elem)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect count of nonce', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }

    const elem = tx.nonce.pop()
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)
    tx.nonce.push(elem)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect count of scheduleId', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }

    const elem = tx.scheduleId.pop()
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)
    tx.scheduleId.push(elem)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect one of scheduleId parameter', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }
    const incorrectScheduleId = -1
    const elem = tx.scheduleId.pop()
    tx.scheduleId.push(incorrectScheduleId)
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)
    tx.scheduleId[tx.scheduleId.length-1] = elem

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Unsupported fund release scheduleId ${tx.scheduleId.length-1} parameters: ${incorrectScheduleId}`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for incorrect count of cancalableBy accounts', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = { ...require('./fixtures/solanaSplBlockchainTransaction').txBatchFundReleaseSchedule }
  
    tx.cancelableBy = Array(11).fill(tx.from)
    const validResults = await solanaTxValidator.isSplBatchFundReleaseScheduleTxValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Cancalable by accounts more than 10: ${tx.cancelableBy.length}`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })
});