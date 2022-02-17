import { TOKEN_LOCKUP_ABI } from './splTockenlockupAbi.js'

import {
  Transaction,
  PublicKey,
} from '@solana/web3.js'

import {
  TOKEN_PROGRAM_ID,
  Token
} from '@solana/spl-token'

import anchor from '@project-serum/anchor'

import BigNumber from 'bignumber.js'
import SolanaTxHelper from './SolanaTxHelper.mjs'

const SOLANA_MAX_TRANSACTION_SIZE = 1232
const SOLANA_SIGNATURE_SIZE = 64
const SOLANA_MAX_TRANSACTION_UNSIGNED_SIZE = SOLANA_MAX_TRANSACTION_SIZE - SOLANA_SIGNATURE_SIZE

function getNonceBytes(value) {
  const valueStr = value.toString(16)
  const MAX_LENGTH = 16

  for (var bytes = [], c = 0; c < valueStr.length; c += 2) {
    const num = parseInt(valueStr.substr(c, 2), 16)
    bytes.push(isNaN(num) ? 0 : num)
  }

  while (bytes.length < MAX_LENGTH) {
    bytes = [0].concat(bytes)
  }

  return bytes
}

export default class TokenLockupTxHelper {
  constructor(connection, wallet, programId) {
    this.connection = connection
    const _idl = TOKEN_LOCKUP_ABI
    console.log(programId)
    this.programId = new PublicKey(programId)
    const provider = new anchor.Provider(
      connection, wallet, 'confirmed',
    )
    this.program = new anchor.Program(_idl, this.programId, provider)
    this.provider = wallet
  }

  async create(obj) {
    switch (obj.type) {
      case 'Blockchain::Solana::Tx::SplLockup::FundReleaseSchedule':
        return await this.fundReleaseSchedule(obj)
      case 'Blockchain::Solana::Tx::SplLockup::BatchFundReleaseSchedule':
        return await this.batchFundReleaseSchedule(obj)
      default:
        throw new Error(`Unsupported transaction type: ${obj.type}`)
    }
  }

  /**
     * Transfer amount to vesting schedule account for future payouts
     * @param {object} obj - Sample of the object with data is shown above
     * @returns {Transaction} - creates Transaction with set of instruction for FundReleaseSchedule
     */
  async fundReleaseSchedule(obj) {
    const fromPubKey = new PublicKey(obj.from)
    const authAcc = fromPubKey
    const toPubKey = new PublicKey(obj.to)
    const cancelableBy = obj.cancelableBy.map(element => new PublicKey(element))
    const nonceBytes = getNonceBytes(new BigNumber(obj.nonce))
    const tokenAccPubKey = new PublicKey(obj.tokenLockAddress)

    if (isNaN(obj.scheduleId) || parseInt(obj.scheduleId) < 0
      || !SolanaTxHelper.isSolanaAmount(obj.amount.toString())) {
      throw new Error(`Unsupported fund release schedule parameters: ${obj.scheduleId}, ${obj.amount}`)
    }
    if (obj.cancelableBy.length > 10) {
      throw new Error(`Cancalable by accounts more than 10: ${obj.cancelableBy.length}`)
    }

    const tokenlockAcc = await this.connection.getAccountInfo(tokenAccPubKey)
    if (!tokenlockAcc) {
      throw new Error('Cannot find locked data account')
    }

    const mintToken = await this.createMint(obj.tokenMintAddress, tokenAccPubKey)
    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(fromPubKey)
    const [toTokenAccount, getAssociatedTokenAddressInstr] =
      await this.getAssociatedTokenAddress(mintToken, toPubKey, fromPubKey)

    let instructions = []
    if (getAssociatedTokenAddressInstr !== null) {
      instructions.push(getAssociatedTokenAddressInstr)
    }

    const insr = await this.fundReleaseScheduleInstruction(
      obj.amount,
      obj.commencementTimestamp,
      obj.scheduleId,
      cancelableBy,
      tokenAccPubKey,
      authAcc,
      fromTokenAccount.address,
      toTokenAccount,
      nonceBytes
    )

    instructions.push(insr)

    return [new Transaction().add(...instructions), null]
  }

  async fundReleaseScheduleInstruction(
    amount, commencementTimestamp,
    scheduleId, cancelableBy,
    tokenlockAcc, authAcc, from, to, nonce) {
    const tokenlockData = await this.program.account.tokenLockData.fetch(tokenlockAcc)

    return this.program.instruction.fundReleaseSchedule(
      nonce,
      new anchor.BN(amount),
      new anchor.BN(commencementTimestamp),
      scheduleId,
      cancelableBy,
      {
        accounts: {
          tokenlockAccount: tokenlockAcc,
          escrowAccount: tokenlockData.escrowAccount,
          from: from,
          to: to,
          authority: authAcc,
          tokenProgram: TOKEN_PROGRAM_ID
        }
      })
  }

  /**
   * Create set of transfers to vesting schedule account for future payouts
   * @param {object} obj - Sample of the object with data is shown above
   * @returns {Transaction} - creates Transaction with set of instruction for BatchFundReleaseSchedule
   */
  async batchFundReleaseSchedule(obj) {
    if (!Array.isArray(obj.amount) || !Array.isArray(obj.commencementTimestamp)
      || !Array.isArray(obj.scheduleId) || !Array.isArray(obj.nonce) || !Array.isArray(obj.to)) {
      throw new Error('Incorrect parameters input')
    }
    if (obj.amount.length !== obj.commencementTimestamp.length ||
      obj.amount.length !== obj.scheduleId.length ||
      obj.amount.length !== obj.nonce.length ||
      obj.amount.length !== obj.to.length) {
      throw new Error('Incorrect parameter array length')
    }
    if (obj.cancelableBy.length > 10) {
      throw new Error(`Cancalable by accounts more than 10: ${obj.cancelableBy.length}`)
    }

    const mintAddress = obj.tokenMintAddress
    const fromPubKey = new PublicKey(obj.from)
    const authAcc = fromPubKey // or provider.walletAddress ??
    const cancelableBy = obj.cancelableBy.map(element => new PublicKey(element))
    const tokenAccPubKey = new PublicKey(obj.tokenLockAddress)

    const tokenlockAcc = await this.connection.getAccountInfo(tokenAccPubKey)
    if (!tokenlockAcc) {
      throw new Error('Cannot find locked data account')
    }
    const mintToken = await this.createMint(mintAddress, tokenAccPubKey)
    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(fromPubKey)

    let instructions = []
    for (let i = 0; i < obj.amount.length; i++) {
      if (isNaN(obj.scheduleId[i]) || parseInt(obj.scheduleId[i]) < 0
        || !SolanaTxHelper.isSolanaAmount(obj.amount[i].toString())) {
        throw new Error(`Unsupported fund release schedule [${i}] parameters: ${obj.scheduleId[i]}, ${obj.amount[i]}`)
      }

      const nonceBytes = getNonceBytes(new BigNumber(obj.nonce[i]))
      const [toTokenAccount, getAssociatedTokenAddressInstr] =
        await this.getAssociatedTokenAddress(mintToken, new PublicKey(obj.to[i]), fromPubKey)

      if (getAssociatedTokenAddressInstr !== null) {
        instructions.push(getAssociatedTokenAddressInstr)
      }

      instructions.push(await this.fundReleaseScheduleInstruction(
        obj.amount[i],
        obj.commencementTimestamp[i],
        obj.scheduleId[i],
        cancelableBy,
        tokenAccPubKey,
        authAcc,
        fromTokenAccount.address,
        toTokenAccount,
        nonceBytes
      ))

      await this.transactionSizeControl(instructions, authAcc)
    }

    return [new Transaction().add(...instructions), null]
  }

  async transactionSizeControl(instructions, feePayer) {
    const transaction = new Transaction().add(...instructions)
    transaction.feePayer = new PublicKey(feePayer)
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash

    let msg = transaction.serializeMessage()
    if (msg.length > SOLANA_MAX_TRANSACTION_UNSIGNED_SIZE) {
      throw {
        name: 'SolanaTransactionSizeError',
        message: 'Transaction size too large. Please try to reduce transaction count.'
      }
    }
  }

  async createMint(tokenMintAddress, from) {
    const mintPublicKey = new PublicKey(tokenMintAddress)

    const mintToken = new Token(
      this.connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      new PublicKey(from)
    )

    return mintToken
  }

  async getAssociatedTokenAddress(mintToken, ownerPublicKey, payerPubKey, allowOwnerOffCurve = false) {
    const associatedAccountTokenAddr = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintToken.publicKey,
      ownerPublicKey,
      allowOwnerOffCurve
    )
    const receiverAccount = await this.connection.getAccountInfo(associatedAccountTokenAddr)

    let instruction = null
    if (receiverAccount === null) {
      instruction =
        Token.createAssociatedTokenAccountInstruction(
          mintToken.associatedProgramId,
          mintToken.programId,
          mintToken.publicKey,
          associatedAccountTokenAddr,
          ownerPublicKey,
          payerPubKey
        )
    }

    return [associatedAccountTokenAddr, instruction]
  }
}
