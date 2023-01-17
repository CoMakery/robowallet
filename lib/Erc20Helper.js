const { ethers } = require('ethers');

class Erc20Helper {
  static encodeFunctionData(contract) {
    const contractInterface = new ethers.utils.Interface(contract.abi)

    return contractInterface.encodeFunctionData(
      contract.method,
      contract.parameters
    )
  }
}

exports.Erc20Helper = Erc20Helper