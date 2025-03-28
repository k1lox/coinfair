import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    // 单次
    hardhat: {
      forking: {
        url: "https://rpc.ankr.com/bsc/9c9763b95d62a8269670b0aa089f1ba82604d70f86115ee5185f54c6a837166f",
        blockNumber: 45000000
      },
      chainId: 56,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: 
      [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
      ]
    },
    bsc: {
      url: "https://rpc.ankr.com/bsc/9c9763b95d62a8269670b0aa089f1ba82604d70f86115ee5185f54c6a837166f",
    }
  },
  paths: {
    sources: "./contracts",
  }
};

export default config;