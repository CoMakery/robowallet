import {
  Connection,
  Transaction,
  clusterApiUrl,
  PublicKey,
  SystemProgram
} from '@solana/web3.js'

import {
  TOKEN_PROGRAM_ID,
  Token
} from '@solana/spl-token'

export default class SolanaTxHelper {
  constructor(network) {
    const networks = {
      'solana': 'mainnet-beta',
      'solana_devnet': 'devnet',
      'solana_testnet': 'testnet'
    }

    this.connection = new Connection(clusterApiUrl(networks[network]))
  }

  async create(obj) {
    let transaction

    switch (obj.type) {
      case 'Blockchain::Solana::Tx::SystemProgram::Transfer':
        transaction = this.createSystemProgramTransferTransaction(obj)
        break
      case 'Blockchain::Solana::Tx::Spl::Transfer':
        transaction = await this.createSPLTransferTransaction(obj)
        break
      default:
        throw new Error(`Unsupported transaction type: ${obj.type}`)
    }

    transaction.feePayer = new PublicKey(obj.from)
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash

    return transaction
  }

  createSystemProgramTransferTransaction(obj) {
    return new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(obj.from),
        toPubkey: new PublicKey(obj.to),
        lamports: parseInt(obj.amount)
      })
    )
  }

  async createSPLTransferTransaction(obj) {
    const mintPublicKey = new PublicKey(obj.tokenMintAddress)

    const mintToken = new Token(
      this.connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      new PublicKey(obj.from)
    )

    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      new PublicKey(obj.from)
    )

    const destPublicKey = new PublicKey(obj.to)

    const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      destPublicKey
    )

    const receiverAccount = await this.connection.getAccountInfo(associatedDestinationTokenAddr)

    const instructions = []

    if (receiverAccount === null) {
      instructions.push(
        Token.createAssociatedTokenAccountInstruction(
          mintToken.associatedProgramId,
          mintToken.programId,
          mintPublicKey,
          associatedDestinationTokenAddr,
          destPublicKey,
          new PublicKey(obj.from)
        )
      )
    }

    instructions.push(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        associatedDestinationTokenAddr,
        new PublicKey(obj.from),
        [],
        obj.amount
      )
    )

    return new Transaction().add(...instructions)
  }
}
