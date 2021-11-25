const txRaw = {
  "type": "Blockchain::Solana::Tx::SystemProgram::Transfer",
  "from": "33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL",
  "to": "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i",
  "amount": 5
}

const blockchainTransaction = {
  id: 2794,
  award_id: null,
  amount: 5,
  source: "33MWWFqCqjKYhWrqwFcqmq5yFerdNJ9JQbKpKqMynmZL",
  destination: "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i",
  nonce: null,
  contract_address: null,
  network: "solana_devnet",
  txHash: null,
  txRaw: JSON.stringify(txRaw),
  status: 'created',
  statusMessage: null,
  createdAt: '2021-05-18T08:33:01.217Z',
  updatedAt: '2021-05-18T08:33:01.217Z',
  syncedAt: null,
  blockchainTransactables: [
    {
      id: null,
      blockchainTransactableType: 'Award',
      blockchainTransactableId: 110
    }
  ]
}

module.exports = { blockchainTransaction }
