import algosdk from 'algosdk'

export const Permission = Object.freeze({
  walletAdmin: 1,
  transferRulesAdmin: 2,
  reserveAdmin: 4,
  contractAdmin: 8
})

const ALGO_UINT_TYPE = 2

export const MAX_UINT64 = BigInt('18446744073709551615')

export class AlgorandApplicationTxValidator {
  constructor(client) {
    this.algodClient = client
  }

  getUserAppValue(userAppData, key) {
    const permission = userAppData['key-value'].find(x => x.key === Buffer.from(key).toString('base64'))
    return permission ? permission.value.uint : 0
  }

  getAppRules(appData) {
    const rules = appData.filter(x => Buffer.from(x.key, 'base64').toString().startsWith('rule'))
    return rules
  }

  hasRule(rules, fromGroup, toGroup) {
    return rules.some(
      x => algosdk.decodeUint64(Buffer.from(x.key, 'base64').slice(4, 12)) === fromGroup
        && algosdk.decodeUint64(Buffer.from(x.key, 'base64').slice(12, 20)) === toGroup
    )
  }

  validateSetTransferRuleTx(appParams, walletPermissions, fromGroup, toGroup) {
    if (!walletPermissions || (walletPermissions & Permission.transferRulesAdmin) === 0) {
      throw new Error('Wallet is not allowed to set transfer rules')
    }
    const uintParamsCount = appParams['global-state'].filter(x => x.value.type === ALGO_UINT_TYPE).length
    const rules = this.getAppRules(appParams['global-state'])
    const isRuleExists = this.hasRule(rules, fromGroup, toGroup)
    const maxUintSchemaParamsCount = appParams['global-state-schema']['num-uint']
    if (!isRuleExists && uintParamsCount >= maxUintSchemaParamsCount) {
      throw new Error(`Number of maximum new params is reached on-chain: ${maxUintSchemaParamsCount}`)
    }
  }

  getWalletAppData(appsLocalState, appId) {
    if (appsLocalState) {
      return appsLocalState.find(app => app.id === appId)
    }
    return null
  }

  getAppParams(appInfo) {
    let target = {}
    appInfo['global-state'].forEach((item) => {
      target[Buffer.from(item.key, 'base64').toString()] = item.value
    })
    return target
  }

  getUserAppData(userAppData) {
    let target = {}
    userAppData['key-value'].forEach((item) => {
      target[Buffer.from(item.key, 'base64').toString()] = item.value
    })
    return target
  }

  async validateTransferTx(userAppData, tx, appInfo, amount) {
    const fromUserAppData = this.getUserAppData(userAppData)
    const amountBN = BigInt(amount)
    if (BigInt(fromUserAppData['balance'].uint) < amountBN) {
      throw new Error(`Insufficient balance to transfer ${amount} from wallet ${tx.from}`)
    }
    if (fromUserAppData['frozen'] && fromUserAppData['frozen'].uint > 0) {
      throw new Error(`Sender wallet ${tx.from} is frozen`)
    }
    if (fromUserAppData['lockUntil'].uint > getNowTimestamp()) {
      const lockUntilStr = getLocalDatetimeUTC(fromUserAppData['lockUntil'].uint)
      throw new Error(`Sender wallet ${tx.from} is locked until ${lockUntilStr}`)
    }
    const appParams = this.getAppParams(appInfo)
    if (appParams['paused'].uint > 0) {
      throw new Error(`Token is paused`)
    }

    return this.validateTransferTo(
      fromUserAppData['transferGroup'].uint,
      tx,
      appParams,
      amountBN
    )
  }

  async validateTransferTo(fromGroup, tx, appParams, amountBN) {
    const nowTimestamp = getNowTimestamp()

    for (const walletAddress of tx.appAccounts) {
      const toAccountInfo = await this.algodClient.accountInformation(walletAddress).do()
      // validate that each recipient accounts are opted-in to the app
      const toAppData = this.getWalletAppData(toAccountInfo['apps-local-state'], tx.appIndex)
      if (!toAppData) {
        throw new Error(`Recipient wallet ${walletAddress} is not opted-in to the app ${tx.appIndex}`)
      }
      const toAppParam = this.getUserAppData(toAppData)
      if (toAppParam['frozen'] && toAppParam['frozen'].uint > 0) {
        throw new Error(`Recipient wallet ${walletAddress} is frozen`)
      }
      const maxBalance = BigInt(toAppParam['maxBalance'].uint)
      const balance = BigInt(toAppParam['balance'].uint)
      if (maxBalance < amountBN + balance) {
        throw new Error(`Recipient wallet ${walletAddress} balance will exceed max balance`)
      }
      const fromGroupBuf = Buffer.from(algosdk.encodeUint64(fromGroup))
      const toGroupBuf = Buffer.from(algosdk.encodeUint64(toAppParam['transferGroup'].uint))
      const rule = 'rule'.concat(fromGroupBuf.toString(), toGroupBuf.toString())
      if (!(rule in appParams)
        || appParams[rule].uint === 0
        || appParams[rule].uint > nowTimestamp) {
        throw new Error(`Transfer from group ${fromGroup} to ${toAppParam['transferGroup'].uint} is not allowed`)
      }
    }
  }

  async validateMintTx(tx, permission, amount) {
    if (!permission || (permission & Permission.reserveAdmin) === 0) {
      throw new Error(`Wallet ${tx.from} is not allowed to mint`)
    }
    const txAmount = BigInt(amount)
    for (const walletAddress of tx.appAccounts) {
      const toAccountInfo = await this.algodClient.accountInformation(walletAddress).do()
      // validate that each recipient accounts are opted-in to the app
      const toAppData = this.getWalletAppData(toAccountInfo['apps-local-state'], tx.appIndex)
      if (!toAppData) {
        throw new Error(`Recipient wallet ${walletAddress} is not opted-in to the app ${tx.appIndex}`)
      }
      // checkBalance
      const toUserAppData = this.getUserAppData(toAppData)
      const toTokenBalance = BigInt(toUserAppData.balance.uint)
      const toMaxBalance = BigInt(toUserAppData.maxBalance.uint)
      if (toTokenBalance + txAmount > toMaxBalance) {
        throw new Error(`Token balance will exceed max balance ${toMaxBalance.toString()} for wallet ${walletAddress}`)
      }
    }
  }

  async validateBurnTx(tx, permission, amount) {
    if (!permission || (permission & Permission.reserveAdmin) === 0) {
      throw new Error(`Wallet ${tx.from} is not allowed to burn`)
    }
    const txAmount = BigInt(amount)
    for (const walletAddress of tx.appAccounts) {
      const toAccountInfo = await this.algodClient.accountInformation(walletAddress).do()
      // validate that each recipient accounts are opted-in to the app
      const toAppData = this.getWalletAppData(toAccountInfo['apps-local-state'], tx.appIndex)
      if (!toAppData) {
        throw new Error(`Recipient wallet ${walletAddress} is not opted-in to the app ${tx.appIndex}`)
      }
      // checkBalance
      const toUserAppData = this.getUserAppData(toAppData)
      const toTokenBalance = BigInt(toUserAppData.balance.uint)
      if (toTokenBalance - txAmount < BigInt(0)) {
        throw new Error(`Wallet ${walletAddress} does not have enough tokens to burn`)
      }
    }
  }

  validateSetAddressPermissionsTx(maxBalance, permission) {
    if (!permission || (permission & Permission.walletAdmin) === 0) {
      throw new Error('Wallet is not allowed to set address permissions')
    }

    const maxBalanceBN = BigInt(maxBalance)
    if (maxBalanceBN < 0 || maxBalanceBN > MAX_UINT64) {
      throw new Error('Max balance must be greater than 0 and less than 2^64-1')
    }
  }

  validatePauseTx(permission) {
    if (!permission || (permission & Permission.contractAdmin) === 0) {
      throw new Error('Wallet is not allowed to pause the token')
    }
  }

  async validateAppTx(tx, accountInfo) {
    const userAppData = this.getWalletAppData(accountInfo['apps-local-state'], tx.appIndex)
    if (!userAppData) {
      throw new Error(`Wallet ${tx.from} is not opted-in to the app ${tx.appIndex}`)
    }
    const appInfo = await this.algodClient.getApplicationByID(tx.appIndex).do()
    const txAppData = tx.appArgs.split(',')
    const txAppType = txAppData[0].split(':')[1]

    switch (txAppType) {
      case 'transfer': {
        const transferAmount = txAppData[1].split(':')[1]
        return this.validateTransferTx(userAppData, tx, appInfo.params, transferAmount)
      }
      case 'setTransferRule': {
        const fromGroup = txAppData[1].split(':')[1]
        const toGroup = txAppData[2].split(':')[1]
        return this.validateSetTransferRuleTx(
          appInfo.params,
          this.getUserAppValue(userAppData, 'roles'),
          Number(fromGroup),
          Number(toGroup)
        )
      }
      case 'setAddressPermissions': {
        const maxBalance = txAppData[2].split(':')[1]
        return this.validateSetAddressPermissionsTx(
          maxBalance,
          this.getUserAppValue(userAppData, 'roles')
        )
      }
      case 'pause':
        return this.validatePauseTx(this.getUserAppValue(userAppData, 'roles'))
      case 'mint': {
        const mintAmount = txAppData[1].split(':')[1]
        return this.validateMintTx(
          tx,
          this.getUserAppValue(userAppData, 'roles'),
          mintAmount
        )
      }
      case 'burn': {
        const burnAmount = txAppData[1].split(':')[1]
        return this.validateBurnTx(
          tx,
          this.getUserAppValue(userAppData, 'roles'),
          burnAmount
        )
      }
      default:
        throw new Error(`Unknown app tx type ${txAppType}`)
    }
  }

  async validateTx(tx) {
    if (tx.type !== 'appl') {
      throw new Error(`Invalid transaction type ${tx.type}`)
    }
    const accountInfo = await this.algodClient.accountInformation(tx.from).do()

    return this.validateAppTx(tx, accountInfo)
  }
}

export function getNowTimestamp() {
  return Math.floor(Date.now() / 1000)
}

export function getLocalDatetimeUTC(lockUntil) {
  const lockUntilDate = new Date(lockUntil * 1000)
  return `${lockUntilDate.toLocaleString('en-US', { timeZone: 'UTC' })} UTC`
}
