require("dotenv").config()
const redis = require("redis")
const hwUtils = require("./lib/hotwalletUtils")

const envs = {
  projectId: process.env.PROJECT_ID,
  projectApiKey: process.env.PROJECT_API_KEY,
  comakeryServerUrl: process.env.COMAKERY_SERVER_URL,
  purestakeApi: process.env.PURESTAKE_API,
  rpcUrl: process.env.RPC_URL,
  redisUrl: process.env.REDIS_URL,
  emptyQueueDelay: parseInt(process.env.EMPTY_QUEUE_DELAY),
  betweenTransactionDelay: parseInt(process.env.BETWEEN_TRANSACTION_DELAY),
  optInApp: parseInt(process.env.OPT_IN_APP),
  blockchainNetwork: process.env.BLOCKCHAIN_NETWORK,
  maxAmountForTransfer: parseInt(process.env.MAX_AMOUNT_FOR_TRANSFER),
  ethereumTokenType: process.env.ETHEREUM_TOKEN_TYPE,
  ethereumTokenSymbol: process.env.ETHEREUM_TOKEN_SYMBOL,
  ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
  ethereumApprovalContractAddress: process.env.ETHEREUM_APPROVAL_CONTRACT_ADDRESS,
  ethereumMaxFeePerGas: process.env.ETHEREUM_MAX_FEE_PER_GAS,
  ethereumMaxPriorityFeePerGas: process.env.ETHEREUM_MAX_PRIORITY_FEE_PER_GAS
}

const redisClientOptions = {
  url: envs.redisUrl
}

if (envs.redisUrl.includes("rediss://")) {
  redisClientOptions.tls = {
    rejectUnauthorized: false
  }
}

const redisClient = redis.createClient(redisClientOptions)

async function initialize() {
  if (!hwUtils.checkAllVariablesAreSet(envs)) {
    console.error("Some ENV vars was not set")
    return false
  }
  return await hwUtils.hotWalletInitialization(envs, redisClient)
}

(async () => {
  const initialized = await initialize()
  if (initialized) {
    hwUtils.runServer(envs, redisClient)
  }
})();
