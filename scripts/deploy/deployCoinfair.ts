    // scripts/deploy/deployCoinfair.ts
    import { ethers } from "hardhat";
    import * as dotenv from "dotenv";

    dotenv.config();

    async function main() {
    console.log("Deploying Coinfair contracts...");

    // 获取部署账户
    const [deployer, operator1, operator2, operator3] = await ethers.getSigners();
    
    console.log(`deployer : ${deployer.address}`);

    console.log(`operator1: ${operator1.address}`);
    
    console.log(`operator2: ${operator2.address}`);

    console.log(`operator3: ${operator3.address}`);

    // 部署USDT
    console.log("Deploying USDT...");
    const USDT = await ethers.getContractFactory("USDT", deployer);
    const usdt = await USDT.deploy();
    await usdt.waitForDeployment();
    const usdtAddress = await usdt.getAddress();
    console.log(`USDT deployed to: ${usdtAddress}`);

    // 部署WETH
    console.log("Deploying WETH...");
    const WETH = await ethers.getContractFactory("WBNB", deployer);
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();
    console.log(`WETH deployed to: ${wethAddress}`);

    // 部署Treasury
    console.log("Deploying Treasury...");
    const Treasury = await ethers.getContractFactory("CoinfairTreasury", deployer);
    const treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log(`Treasury deployed to: ${treasuryAddress}`);

    // 部署Factory
    console.log("Deploying Factory...");
    const Factory = await ethers.getContractFactory("CoinfairFactory", deployer);
    const factory = await Factory.deploy(treasuryAddress);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`Factory deployed to: ${factoryAddress}`);

    // 获取INIT_CODE_PAIR_HASH
    const initCodePairHash = await factory.INIT_CODE_PAIR_HASH();
    console.log(`INIT_CODE: ${initCodePairHash}`);

    // 部署Library01
    console.log("Deploying Library...");
    const Library01 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter.sol:CoinfairLibrary", deployer);
    const library01 = await Library01.deploy();
    await library01.waitForDeployment();
    const libraryAddress01 = await library01.getAddress();
    console.log(`Library deployed to: ${libraryAddress01}`);

    // 部署Library02
    console.log("Deploying Library...");
    const Library02 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter02.sol:CoinfairLibrary", deployer);
    const library02 = await Library02.deploy();
    await library02.waitForDeployment();
    const libraryAddress02 = await library02.getAddress();
    console.log(`Library deployed to: ${libraryAddress02}`);

    // 部署Hot Router 01(需要链接库)
    console.log("Deploying Hot Router...");
    const HotRouter01 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter.sol:CoinfairHotRouter", {
    libraries: {
        CoinfairLibrary: libraryAddress01
    }
    }, deployer);
    const hotRouter01 = await HotRouter01.deploy(factoryAddress);
    await hotRouter01.waitForDeployment();
    const hotRouter01Address = await hotRouter01.getAddress();
    console.log(`Hot Router deployed to: ${hotRouter01Address}`);

    // 部署Hot Router 02 (需要链接库)
    console.log("Deploying Hot Router 02...");
    const HotRouter02 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter02.sol:CoinfairHotRouter", {
    libraries: {
        CoinfairLibrary: libraryAddress02
    }
    }, deployer);
    const hotRouter02 = await HotRouter02.deploy(factoryAddress);
    await hotRouter02.waitForDeployment();
    const hotRouter02Address = await hotRouter02.getAddress();
    console.log(`Hot Router 02 deployed to: ${hotRouter02Address}`);

    // 部署Warm Router 01(需要链接库)
    console.log("Deploying Warm Router...");
    const WarmRouter = await ethers.getContractFactory("contracts/protocol/CoinfairRouter.sol:CoinfairWarmRouter", {
    libraries: {
        CoinfairLibrary: libraryAddress02
    }
    }, deployer);
    const warmRouter01 = await WarmRouter.deploy(factoryAddress);
    await warmRouter01.waitForDeployment();
    const warmRouter01Address = await warmRouter01.getAddress();
    console.log(`Warm Router deployed to: ${warmRouter01Address}`);

    // 部署Warm Router 02(需要链接库)
    console.log("Deploying Warm Router...");
    const WarmRouter02 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter02.sol:CoinfairWarmRouter", {
        libraries: {
        CoinfairLibrary: libraryAddress02
        }
    }, deployer);
    const warmRouter02 = await WarmRouter.deploy(factoryAddress);
    await warmRouter02.waitForDeployment();
    const warmRouter02Address = await warmRouter01.getAddress();
    console.log(`Warm Router deployed to: ${warmRouter01Address}`);

    // 部署NFT
    console.log("Deploying NFT...");
    const NFT = await ethers.getContractFactory("CoinfairNFT", deployer);
    const nft = await NFT.deploy();
    await nft.waitForDeployment();
    const nftAddress = await nft.getAddress();
    console.log(`NFT deployed to: ${nftAddress}`);

    // 设置DEX地址
    console.log("Setting DEX addresses in Treasury...");
    await treasury.setDEXAddress(factoryAddress, nftAddress, warmRouter01Address);

    // 设置路由地址
    console.log("Setting router addresses...");
    await factory.setRouterAddress(hotRouter01Address, warmRouter01Address);
    await factory.setRouterAddress(hotRouter02Address, warmRouter02Address);

    // 验证设置
    const hotFromFac = await factory.hotRouterAddress();
    console.log(`Hot Router from Factory: ${hotFromFac}`);
    const warmFromFac = await factory.warmRouterAddress();
    console.log(`Warm Router from Factory: ${warmFromFac}`);

    console.log("Deployment completed!");

    // 保存部署信息
    console.log({
    USDT: usdtAddress,
    WETH: wethAddress,
    Treasury: treasuryAddress,
    Factory: factoryAddress,
    Library01: libraryAddress01,
    Library02: libraryAddress02,
    HotRouter01: hotRouter01Address,
    HotRouter02: hotRouter02Address,
    WarmRouter01: warmRouter01Address,
    WarmRouter02: warmRouter02Address,
    NFT: nftAddress
    });
    }

    main()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });