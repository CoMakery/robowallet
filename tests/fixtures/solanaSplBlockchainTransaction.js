const { default: BigNumber } = require("bignumber.js")

const txRaw = {
  "type": "Blockchain::Solana::Tx::Spl::Transfer",
  "from": "CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58",
  "to": "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i",
  "amount": 5,
  "tokenMintAddress": "91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g"
}

const txBatchRaw = {
  "type": "Blockchain::Solana::Tx::Spl::BatchTransfer",
  "from": "CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58",
  "to": [
    "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i",
    "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i",
    "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i"
  ],
  "amount": [
    new BigNumber('100000000123456789'),
    10000,
    200000
  ],
  "tokenMintAddress": "91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g"
}

const blockchainTransactablesBatch = [
  {
    id: null,
    blockchainTransactableType: 'Award',
    blockchainTransactableId: 110
  },
  {
    id: null,
    blockchainTransactableType: 'Award',
    blockchainTransactableId: 111
  },
  {
    id: null,
    blockchainTransactableType: 'Award',
    blockchainTransactableId: 112
  },
]

const blockchainTransaction = {
  id: 2794,
  award_id: null,
  amount: 5,
  source: "CQSE22PAUYdorqCLqAguCkjAvhSnCB2zXyNPTinWNG58",
  destination: "7mcPNUWybcizxEid8ntjwPrGgD5PdjXHdhPPHcUcBR6i",
  nonce: null,
  contractAddress: "91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g",
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

module.exports = { blockchainTransaction, txRaw, txBatchRaw, blockchainTransactablesBatch}
