import {
  Connection,
  Transaction,
  clusterApiUrl,
  PublicKey,
  SystemProgram
} from '@solana/web3.js'

import {
  TOKEN_PROGRAM_ID,
  Token,
  u64 as U64
} from '@solana/spl-token'

import TokenLockupTxHelper from './TokenLockupHelper.mjs'

export default class SolanaTxHelper {
  constructor(network, provider) {
    const networks = {
      'solana': 'mainnet-beta',
      'solana_devnet': 'devnet',
      'solana_testnet': 'testnet'
    }

    this.connection = new Connection(clusterApiUrl(networks[network]))
    this.provider = provider
  }

  async sendRawTransaction(signed) {
    return await this.connection.sendRawTransaction(
      signed.serialize(),
      { skipPreflight: true }
    )
  }

  async confirmTransaction(signature) {
    await this.connection.confirmTransaction(signature)
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
      case 'Blockchain::Solana::Tx::Spl::BatchTransfer':
        transaction = await this.createSPLBatchTransfer(obj)
        break
      case 'Blockchain::Solana::Tx::SplLockup::FundReleaseSchedule':
      case 'Blockchain::Solana::Tx::SplLockup::BatchFundReleaseSchedule':
        transaction = await this.createSplLockup(obj)
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

  async createSplLockup(obj) {
    const tokenLockupTxHelper = new TokenLockupTxHelper(this.connection, this.provider, obj.programId)
    return await tokenLockupTxHelper.create(obj)
  }

  createSystemProgramTransferTransaction(obj) {
    if (typeof obj.from !== 'string' || typeof obj.to !== 'string'
      || !SolanaTxHelper.isSolanaAmount(obj.amount.toString())) {
      throw new Error(`Unsupported transfer parameters: ${typeof obj.from}, ${typeof obj.to}, ${typeof obj.amount}`)
    }

    return new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(obj.from),
        toPubkey: new PublicKey(obj.to),
        lamports: new U64(obj.amount.toString())
      })
    )
  }

  async createSPLTransferTransaction(obj) {
    if (typeof obj.from !== 'string' || typeof obj.to !== 'string'
      || !SolanaTxHelper.isSolanaAmount(obj.amount.toString())) {
      throw new Error(`Unsupported SPL transfer parameters: ${typeof obj.from}, ${typeof obj.to}, ${typeof obj.amount}`)
    }

    const [mintPublicKey, mintToken] = await this.createMint(obj)
    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      new PublicKey(obj.from)
    )

    let instructions = await this.createSplTransferInstructions(mintToken, mintPublicKey, obj.from, fromTokenAccount, obj.to, obj.amount)

    return new Transaction().add(...instructions)
  }

  async createSPLBatchTransfer(obj) {
    if (typeof obj.from !== 'string' || !Array.isArray(obj.to) || !Array.isArray(obj.amount)) {
      throw new Error(`Unsupported SPL batch transfer parameters: ${typeof obj.from}, ${typeof obj.to}, ${typeof obj.amount}`)
    }
    if (obj.to.length !== obj.amount.length) {
      throw new Error(`Incorrect SPL batch transfer size: ${obj.to.length} != ${obj.amount.length}`)
    }
    const [mintPublicKey, mintToken] = await this.createMint(obj)

    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      new PublicKey(obj.from)
    )

    let transaction = new Transaction()
    for (let idx = 0; idx < obj.to.length; idx++) {
      if (typeof obj.to[idx] !== 'string' || !SolanaTxHelper.isSolanaAmount(obj.amount[idx].toString())) {
        throw new Error(`Unsupported SPL batch transfer parameters [${idx}]: ${typeof obj.to[idx]}, ${typeof obj.amount[idx]}`)
      }
      let instructions = await this.createSplTransferInstructions(mintToken, mintPublicKey, obj.from, fromTokenAccount, obj.to[idx], obj.amount[idx])

      transaction.add(...instructions)
    }

    return transaction
  }

  async createSplTransferInstructions(mintToken, mintPublicKey, from, fromTokenAccount, to, amount) {
    const destPublicKey = new PublicKey(to)
    const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      destPublicKey
    )

    const receiverAccount = await this.connection.getAccountInfo(associatedDestinationTokenAddr)
    const fromPublicKey = new PublicKey(from)
    const instructions = []

    if (receiverAccount === null) {
      // increase transaction size ~78 bytes
      instructions.push(
        Token.createAssociatedTokenAccountInstruction(
          mintToken.associatedProgramId,
          mintToken.programId,
          mintPublicKey,
          associatedDestinationTokenAddr,
          destPublicKey,
          fromPublicKey
        )
      )
    }

    instructions.push(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        associatedDestinationTokenAddr,
        fromPublicKey,
        [],
        new U64(amount.toString())
      )
    )

    return instructions
  }

  async createMint(obj) {
    const mintPublicKey = new PublicKey(obj.tokenMintAddress)

    const mintToken = new Token(
      this.connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      new PublicKey(obj.from)
    )

    return [mintPublicKey, mintToken]
  }

  static isSolanaAmount(amount) {
    return /^\d+$/.test(amount.toString())
  }
}
