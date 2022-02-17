const SolanaBlockchain = require('../lib/blockchains/SolanaBlockchain').SolanaBlockchain
const BigNumber = require('bignumber.js')
const { SolanaTxValidator } = require('../lib/TxValidator');

describe("SolanaTxValidator.isSplTxBatchValid", () => {
  const solanaBlockchain = new SolanaBlockchain({
    figmentApiKey: "figment_project_id",
    blockchainNetwork: 'solana_devnet',
  })

  const solanaTxValidator = new SolanaTxValidator({
    web3: solanaBlockchain.web3,
    blockchain: solanaBlockchain
  })

  test('for not equal transaction count in table and in raw', async () => {
    const blockchainTransaction = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction
    const tx = require('./fixtures/solanaSplBlockchainTransaction').txBatchRaw

    const validResults = await solanaTxValidator.isSplTxBatchValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Please recreate batch and try again`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for not equal sum of amounts in tx raw and total amount', async () => {
    let blockchainTransaction = { ...require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction }
    const tx = require('./fixtures/solanaSplBlockchainTransaction').txBatchRaw
    const blockchainTransactablesBatch = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransactablesBatch
    blockchainTransaction.blockchainTransactables = blockchainTransactablesBatch

    const validResults = await solanaTxValidator.isSplTxBatchValid(blockchainTransaction, tx)

    expect(validResults.valid).toBe(false)
    expect(validResults.markAs).toBe("cancelled")
    expect(validResults.error).toEqual(`Incorrect arguments. Total amount is not equal to transactions sum`)
    expect(validResults.switchHWToManualMode).toBe(true)
  })

  test('for valid spl batch transaction', async () => {
    let blockchainTransaction = { ...require('./fixtures/solanaSplBlockchainTransaction').blockchainTransaction }
    const tx = require('./fixtures/solanaSplBlockchainTransaction').txBatchRaw
    const blockchainTransactablesBatch = require('./fixtures/solanaSplBlockchainTransaction').blockchainTransactablesBatch
    blockchainTransaction.blockchainTransactables = blockchainTransactablesBatch
    blockchainTransaction.amount = BigNumber.sum.apply(null, tx.amount)

    const validResults = await solanaTxValidator.isSplTxBatchValid(blockchainTransaction, tx)

    expect(validResults).toEqual({ valid: true })
  })

});