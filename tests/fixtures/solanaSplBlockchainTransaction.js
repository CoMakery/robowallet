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

const txFundReleaseSchedule = {
  type: 'Blockchain::Solana::Tx::SplLockup::FundReleaseSchedule',
  tokenMintAddress: '91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g',
  tokenLockAddress: "HbndujEQnqw2WSt4frnGacNTQL1vdshFDHyNs5uCK96v",
  from: "G6quj6Xdzgd6KURYWhxJxfB7TDWLUdCGLCeiVJrGT9vR",
  to: "G6quj6Xdzgd6KURYWhxJxfB7TDWLUdCGLCeiVJrGT9vR",
  amount: 5,
  commencementTimestamp: 0,
  nonce: 7473038929252323,
  scheduleId: 1,
  cancelableBy: [
    'G6quj6Xdzgd6KURYWhxJxfB7TDWLUdCGLCeiVJrGT9vR',
    '8TEvCmV1R8gacJEN4kfwGiHk4FofNmRkvMtZAqDZ6fQJ',
    '13MFNMrNGLevvND3xyneCDVrmcrnTczaKcYomJyraoSR',
  ]
}

const txBatchFundReleaseSchedule = {
  type: 'Blockchain::Solana::Tx::SplLockup::BatchFundReleaseSchedule',
  tokenMintAddress: '91enn7UUM3rXqqMAmYgYRNuVQBRgTumTvV7kMCVyz5g',
  tokenLockAddress: "HbndujEQnqw2WSt4frnGacNTQL1vdshFDHyNs5uCK96v",
  from: "G6quj6Xdzgd6KURYWhxJxfB7TDWLUdCGLCeiVJrGT9vR",
  to: [
    "J8bbjVu4kv8SNXHtgzu942EdqNE6bH6Pz7nsE8N1p8Em",
    "4Q1gEA7eSnXDVCTiEy3WVgEWPxBLnGEmAskmLNciZNfp",
    "6BG3RS9HBRSG5hRfoeQLJuQycyAzJimneUzbGvoiqaHC",
  ],
  amount: [
    10001,
    20002,
    30003,
  ],
  commencementTimestamp: [
    100,
    200,
    300,
  ],
  nonce: [
    12312341355,
    2141924555,
    21419088355,
  ],
  scheduleId: [
    1,
    1,
    1,
  ],
  cancelableBy: [
    'G6quj6Xdzgd6KURYWhxJxfB7TDWLUdCGLCeiVJrGT9vR',
    '8TEvCmV1R8gacJEN4kfwGiHk4FofNmRkvMtZAqDZ6fQJ',
    '13MFNMrNGLevvND3xyneCDVrmcrnTczaKcYomJyraoSR',
  ]
}

module.exports = {
  blockchainTransaction,
  txRaw,
  txBatchRaw,
  blockchainTransactablesBatch,
  txFundReleaseSchedule,
  txBatchFundReleaseSchedule
}
