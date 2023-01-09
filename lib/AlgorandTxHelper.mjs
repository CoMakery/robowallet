import algosdk from 'algosdk'
import { MAX_UINT64 } from './validators/AlgorandAppTxValidator.mjs'

export default class AlgorandTxHelper {
  constructor(algodClient) {
    this.algodClient = algodClient
  }

  async create(tx) {
    const suggestedParams = await this.algodClient.getTransactionParams().do()

    if (tx.type === 'pay') {
      return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        closeRemainderTo: tx.closeRemainderTo,
        suggestedParams
      })
    } else if (tx.type === 'axfer') {
      return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        assetIndex: Number(tx.assetIndex),
        suggestedParams
      })
    } else if (tx.type === 'appl') {
      return algosdk.makeApplicationCallTxnFromObject({
        from: tx.from,
        appIndex: Number(tx.appIndex),
        appArgs: this.encodeAlgorandAppArgs(tx.appArgs),
        onComplete: tx.appOnComplete,
        accounts: tx.appAccounts,
        suggestedParams
      })
    } else if (tx.type === 'applClose') {
      return algosdk.makeApplicationCloseOutTxnFromObject({
        from: tx.from,
        appIndex: Number(tx.appIndex),
        appArgs: this.encodeAlgorandAppArgs(tx.appArgs),
        accounts: tx.appAccounts,
        suggestedParams
      })
    } else if (tx.type === 'applClear') {
      return algosdk.makeApplicationClearStateTxnFromObject({
        from: tx.from,
        appIndex: Number(tx.appIndex),
        appArgs: this.encodeAlgorandAppArgs(tx.appArgs),
        accounts: tx.appAccounts,
        suggestedParams
      })
    }

      throw new Error(`Algorand: Unknown transaction type "${tx.type}"`)
    }

    encodeAlgorandAppArgs(inArgs) {
      if (!inArgs) {
        return [];
      }

      const splitArgs = inArgs.split(',')
      const subArgs = []
      splitArgs.forEach((subArg) => {
        subArgs.push(subArg.split(':'))
      })
      const appArgs = []
      subArgs.forEach((subArg) => {
        switch (subArg[0]) {
          case 'str':
            appArgs.push(this.makeUint8Array(Buffer.from(subArg[1])))
            break
          case 'int':
            appArgs.push(this.uintToUint8Array(subArg[1]))
            break
          case 'addr':
            appArgs.push(algosdk.decodeAddress(subArg[1]).publicKey)
            break
          case 'b64':
            appArgs.push(Buffer.from(subArg[1], 'base64'))
            break
          default:
            throw Error(`did not recognize app arg of type${subArg[0]}`)
        }
      })
      return appArgs
    }

    makeUint8Array(arg) {
      return new Uint8Array(arg)
    }

    uintToUint8Array(bn) {
      if (bn > MAX_UINT64) {
        throw new Error(`Number is greater than ${MAX_UINT64}`)
      }
      if (bn === '0') {
        return new Uint8Array(0)
      }

      const bnHex = BigInt(bn).toString(16)
      return algosdk.bigIntToBytes(bnHex, 8)
    }
  }
