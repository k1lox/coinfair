// test/Coinfair.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

describe("Coinfair DEX System", function () {
  // 测试所需的账户变量
  let deployer: Signer, operator1: Signer, operator2: Signer, operator3: Signer;
  let deployerAddress: string, operator1Address: string, operator2Address: string, operator3Address: string;
  
  // 合约实例变量
  let usdt: Contract, weth: Contract;
  let treasury: Contract, factory: Contract, nft: Contract;
  let libraryOriginal: Contract, libraryEnhanced: Contract;
  let hotRouterOriginal: Contract, hotRouterEnhanced: Contract;
  let warmRouterOriginal: Contract, warmRouterEnhanced: Contract;
  
  // 合约地址变量
  let usdtAddress: string, wethAddress: string;
  let treasuryAddress: string, factoryAddress: string, nftAddress: string;
  let libraryOriginalAddress: string, libraryEnhancedAddress: string;
  let hotRouterOriginalAddress: string, hotRouterEnhancedAddress: string;
  let warmRouterOriginalAddress: string, warmRouterEnhancedAddress: string;

  // 交易参数常量
  const SWAP_PARAMS = {
    DEADLINE_MINUTES: 60, // 交易截止时间（分钟）
    POOL_TYPE: 2,  
    SWAP_POOL_TYPE: 1,    // 池子类型
    FEE: 10,              // 手续费率: 1%
    SWAP_N: 1,            // 添加流动性时的交易类型
    MIN_AMOUNT: 0,        // 最小输出金额
    ETH_AMOUNT: "1",      // ETH交易量
    USDT_AMOUNT: "10000" // USDT交易量
  };

  // 在所有测试之前的准备工作
  before(async function() {
    this.timeout(300000); // 设置5分钟超时

    console.log("Setting up test environment...");
    
    // 获取测试用的以太坊账户
    [deployer, operator1, operator2, operator3] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    operator1Address = await operator1.getAddress();
    operator2Address = await operator2.getAddress();
    operator3Address = await operator3.getAddress();
    
    console.log(`Deployer: ${deployerAddress}`);
    console.log(`Operator1: ${operator1Address}`);
    console.log(`Operator2: ${operator2Address}`);
    console.log(`Operator3: ${operator3Address}`);
  });

  // USDT合约部署测试
  it("Should deploy USDT contract", async function() {
    console.log("Deploying USDT...");
    const USDT = await ethers.getContractFactory("USDT", deployer);
    usdt = await USDT.deploy();
    await usdt.waitForDeployment();
    usdtAddress = await usdt.getAddress();
    console.log(`USDT deployed to: ${usdtAddress}`);
    
    // 验证USDT合约部署是否符合预期
    expect(usdtAddress).to.be.property;
    expect(await usdt.name()).to.equal("USDT");
    expect(await usdt.symbol()).to.equal("USDT");
    expect(await usdt.decimals()).to.equal(18);
  });

  // WETH(包装ETH)合约部署测试
  it("Should deploy WETH contract", async function() {
    console.log("Deploying WETH...");
    const WETH = await ethers.getContractFactory("WBNB", deployer);
    weth = await WETH.deploy();
    await weth.waitForDeployment();
    wethAddress = await weth.getAddress();
    console.log(`WETH deployed to: ${wethAddress}`);
    
    // 验证WETH合约部署是否符合预期
    expect(wethAddress).to.be.properAddress;
    expect(await weth.name()).to.equal("Wrapped BNB");
    expect(await weth.symbol()).to.equal("WBNB");
    expect(await weth.decimals()).to.equal(18);
  });

  // Treasury(金库)合约部署测试
  it("Should deploy Treasury contract", async function() {
    console.log("Deploying Treasury...");
    const Treasury = await ethers.getContractFactory("CoinfairTreasury", deployer);
    treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    treasuryAddress = await treasury.getAddress();
    console.log(`Treasury deployed to: ${treasuryAddress}`);
    
    // 验证Treasury合约部署是否符合预期
    expect(treasuryAddress).to.be.properAddress;
    expect(await treasury.AUTHORS()).to.equal("Coinfair");
  });

  // Factory(工厂)合约部署测试
  it("Should deploy Factory contract", async function() {
    console.log("Deploying Factory...");
    const Factory = await ethers.getContractFactory("CoinfairFactory", deployer);
    factory = await Factory.deploy(treasuryAddress);
    await factory.waitForDeployment();
    factoryAddress = await factory.getAddress();
    console.log(`Factory deployed to: ${factoryAddress}`);
    
    // 验证Factory合约部署是否符合预期
    expect(factoryAddress).to.be.properAddress;
    expect(await factory.CoinfairTreasury()).to.equal(treasuryAddress);
    expect(await factory.AUTHORS()).to.equal("@CoinfairGlobal");
    
    const initCodePairHash = await factory.INIT_CODE_PAIR_HASH();
    console.log(`INIT_CODE: ${initCodePairHash}`);
    expect(initCodePairHash).to.not.be.empty;
  });

  // 库合约部署测试
  it("Should deploy Library contracts", async function() {
    console.log("Deploying Libraries...");
    
    // 部署第一个库合约
    const Library01 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter.sol:CoinfairLibrary", deployer);
    libraryOriginal = await Library01.deploy();
    await libraryOriginal.waitForDeployment();
    libraryOriginalAddress = await libraryOriginal.getAddress();
    console.log(`Original Library deployed to: ${libraryOriginalAddress}`);
    
    // 部署第二个库合约
    const Library02 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter02.sol:CoinfairLibrary", deployer);
    libraryEnhanced = await Library02.deploy();
    await libraryEnhanced.waitForDeployment();
    libraryEnhancedAddress = await libraryEnhanced.getAddress();
    console.log(`Enhanced Library deployed to: ${libraryEnhancedAddress}`);
    
    // 验证库合约部署是否符合预期
    expect(libraryOriginalAddress).to.be.properAddress;
    expect(libraryEnhancedAddress).to.be.properAddress;
    expect(libraryOriginalAddress).to.not.equal(libraryEnhancedAddress);
  });

  // Router(路由)合约部署测试
  it("Should deploy Router contracts", async function() {
    console.log("Deploying Routers...");
    
    // 部署热交易路由(原始版) - 链接到原始库
    const HotRouter01 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter.sol:CoinfairHotRouter", {
      libraries: {
        CoinfairLibrary: libraryOriginalAddress
      }
    }, deployer);
    hotRouterOriginal = await HotRouter01.deploy(factoryAddress);
    await hotRouterOriginal.waitForDeployment();
    hotRouterOriginalAddress = await hotRouterOriginal.getAddress();
    console.log(`Original Hot Router deployed to: ${hotRouterOriginalAddress}`);
    
    // 部署热交易路由(增强版) - 链接到增强库
    const HotRouter02 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter02.sol:CoinfairHotRouter", {
      libraries: {
        CoinfairLibrary: libraryEnhancedAddress
      }
    }, deployer);
    hotRouterEnhanced = await HotRouter02.deploy(factoryAddress);
    await hotRouterEnhanced.waitForDeployment();
    hotRouterEnhancedAddress = await hotRouterEnhanced.getAddress();
    console.log(`Enhanced Hot Router deployed to: ${hotRouterEnhancedAddress}`);
    
    // 部署温和交易路由(原始版) - 链接到原始库
    const WarmRouter = await ethers.getContractFactory("contracts/protocol/CoinfairRouter.sol:CoinfairWarmRouter", {
      libraries: {
        CoinfairLibrary: libraryOriginalAddress
      }
    }, deployer);
    warmRouterOriginal = await WarmRouter.deploy(factoryAddress);
    await warmRouterOriginal.waitForDeployment();
    warmRouterOriginalAddress = await warmRouterOriginal.getAddress();
    console.log(`Original Warm Router deployed to: ${warmRouterOriginalAddress}`);
    
    // 部署温和交易路由(增强版) - 链接到增强库
    const WarmRouter02 = await ethers.getContractFactory("contracts/protocol/CoinfairRouter02.sol:CoinfairWarmRouter", {
      libraries: {
        CoinfairLibrary: libraryEnhancedAddress
      }
    }, deployer);
    warmRouterEnhanced = await WarmRouter02.deploy(factoryAddress);
    await warmRouterEnhanced.waitForDeployment();
    warmRouterEnhancedAddress = await warmRouterEnhanced.getAddress();
    console.log(`Enhanced Warm Router deployed to: ${warmRouterEnhancedAddress}`);
    
    // 验证Router合约部署是否符合预期
    expect(hotRouterOriginalAddress).to.be.properAddress;
    expect(hotRouterEnhancedAddress).to.be.properAddress;
    expect(warmRouterOriginalAddress).to.be.properAddress;
    expect(warmRouterEnhancedAddress).to.be.properAddress;
    
    expect(await hotRouterOriginal.factory()).to.equal(factoryAddress);
    expect(await hotRouterEnhanced.factory()).to.equal(factoryAddress);
    expect(await warmRouterOriginal.factory()).to.equal(factoryAddress);
    expect(await warmRouterEnhanced.factory()).to.equal(factoryAddress);
  });

  // NFT合约部署测试
  it("Should deploy NFT contract", async function() {
    console.log("Deploying NFT...");
    const NFT = await ethers.getContractFactory("CoinfairNFT", deployer);
    nft = await NFT.deploy();
    await nft.waitForDeployment();
    nftAddress = await nft.getAddress();
    console.log(`NFT deployed to: ${nftAddress}`);
    
    // 验证NFT合约部署是否符合预期
    expect(nftAddress).to.be.properAddress;
    expect(await nft.name()).to.equal("CoinfairNFT");
    expect(await nft.symbol()).to.equal("CF_NFT");
    expect(await nft.AUTHORS()).to.equal("Coinfair");
  });

  // DEX系统配置测试
  it("Should configure the DEX system correctly", async function() {
    // 在Treasury中设置DEX相关地址
    console.log("Setting DEX addresses in Treasury...");
    await treasury.setDEXAddress(factoryAddress, nftAddress, warmRouterOriginalAddress);
    
    // 在Factory中设置Router地址
    console.log("Setting router addresses...");
    await factory.setRouterAddress(hotRouterOriginalAddress, warmRouterOriginalAddress);
    await factory.setRouterAddress(hotRouterEnhancedAddress, warmRouterOriginalAddress);
    
    // 获取设置后的Router地址以验证配置
    const hotFromFac = await factory.hotRouterAddress();
    const warmFromFac = await factory.warmRouterAddress();
    console.log(`Hot Router from Factory: ${hotFromFac}`);
    console.log(`Warm Router from Factory: ${warmFromFac}`);
    
    // 验证配置是否符合预期
    expect(hotFromFac).to.equal(hotRouterEnhancedAddress); // 期望是后设置的增强版热交易路由
    expect(warmFromFac).to.equal(warmRouterOriginalAddress); // 期望是原始版温和交易路由
  });

  // 流动性池创建测试
  it("Should create a liquidity pool", async function() {
    // 授权Router使用USDT代币
    const approveAmount = ethers.parseUnits("1000", 18);
    await usdt.approve(warmRouterOriginalAddress, approveAmount);
    
    // 获取初始池子数量
    const initialPairsLength = await factory.allPairsLength();
    console.log("Initial pairs count:", initialPairsLength);
  });

  // 反佣系统测试
  it.skip("Should test the rebate system with NFT referrals", async function() {
    this.timeout(300000); // 设置5分钟超时
  
    console.log("\n--- 测试反佣系统 ---");
  
    // 步骤1: 为operator1提供USDT并添加流动性
    console.log("步骤1: operator1添加ETH和USDT流动性");
    
    // 向operator1转移USDT代币
    const tokenAmount = ethers.parseUnits(SWAP_PARAMS.USDT_AMOUNT, 18);
    await usdt.connect(deployer).transfer(operator1Address, tokenAmount);
    console.log(`向operator1转移了 ${ethers.formatUnits(tokenAmount, 18)} USDT`);
    
    // 授权温和交易路由使用operator1的USDT
    await usdt.connect(operator1).approve(warmRouterOriginalAddress, tokenAmount);
    
    // 准备添加流动性参数
    const deadline = Math.floor(Date.now() / 1000) + SWAP_PARAMS.DEADLINE_MINUTES * 60;
    const addLiquidityETHCmd = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint", "uint", "uint", "uint8"],
      [tokenAmount, 0, 0, SWAP_PARAMS.SWAP_N] // 参数: USDT数量, 最小USDT, 最小ETH, 池子类型
    );
    
    // 执行添加流动性操作
    const ethAmount = ethers.parseUnits("100", 18);
    await warmRouterOriginal.connect(operator1).addLiquidityETH(
      usdtAddress,
      addLiquidityETHCmd,
      operator1Address,
      deadline,
      SWAP_PARAMS.FEE, // 费率
      { value: ethAmount }
    );
    console.log(`成功添加流动性: ${ethers.formatUnits(ethAmount, 18)} ETH 和 ${ethers.formatUnits(tokenAmount, 18)} USDT`);
    
    // 步骤2: operator2铸造NFT
    console.log("\n步骤2: operator2 mint NFT");
    const mintCost = await nft.mintCost();
    await nft.connect(operator2).mint(1, { value: mintCost });
    
    // 步骤3: operator3领取operator2的NFT,建立推荐关系
    console.log("\n步骤3: operator3领取operator2的NFT");
    const claimCost = await nft.claimCost();
    await nft.connect(operator3).claim(operator2Address, { value: claimCost });
    
    // 验证推荐关系是否正确
    const [parent, grandParent] = await nft.getTwoParentAddress(operator3Address);
    console.log(`验证推荐关系: operator3的推荐人是 ${parent}`);
    
    // 获取交易对信息和参数
    const pairAddress = await factory.getPair(wethAddress, usdtAddress, SWAP_PARAMS.SWAP_POOL_TYPE, SWAP_PARAMS.FEE);
    console.log(`找到交易对地址: ${pairAddress}`);
    
    const pairABI = [
      "function getPoolType() external view returns (uint8)",
      "function getFee() external view returns (uint)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
      "function isPoolFeeOn() external view returns (uint)"
    ];
    const pairContract = new ethers.Contract(pairAddress, pairABI, deployer);
    
    const actualPoolType = await pairContract.getPoolType();
    const actualFee = await pairContract.getFee();
    const isPoolFeeOn = await pairContract.isPoolFeeOn();
        
    const poolTypePath = [actualPoolType];
    const feePath = [actualFee];
    
    // 步骤4: operator3用ETH兑换USDT
    console.log("\n步骤4: operator3用ETH兑换USDT");
    const swapAmount = ethers.parseUnits(SWAP_PARAMS.ETH_AMOUNT, 18);
    const path = [wethAddress, usdtAddress];
    
    // 检查交换前余额
    const usdtBalanceBefore = await usdt.balanceOf(operator3Address);
    // console.log(`交换前operator3的USDT余额: ${ethers.formatUnits(usdtBalanceBefore, 18)} USDT`);
    
    const initialRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    // console.log(`初始operator2在WETH中的反佣: ${ethers.formatUnits(initialRebateWETH, 18)} WETH`);
    
    // 执行ETH兑换USDT操作
    await hotRouterEnhanced.connect(operator3).swapExactETHForTokens(
      SWAP_PARAMS.MIN_AMOUNT, // 接受任意数量的USDT输出
      path,
      poolTypePath,
      feePath,
      operator3Address,
      deadline,
      { value: swapAmount }
    );
    
    // 计算实际兑换获得的USDT数量
    const usdtBalanceAfter = await usdt.balanceOf(operator3Address);
    const usdtReceived = usdtBalanceAfter-usdtBalanceBefore;
    console.log(`operator3兑换了 ${ethers.formatUnits(swapAmount, 18)} ETH为 ${ethers.formatUnits(usdtReceived, 18)} USDT`);
    
    // 步骤5: 检查ETH兑换USDT后operator2获得的反佣
    console.log("\n步骤5: 检查operator2在ETH->USDT交换后的反佣");
    const afterSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    // console.log(`ETH->USDT交换后，operator2的反佣: ${ethers.formatUnits(afterSwapRebateWETH, 18)} WETH`);
    
    const rebateWETHDiff = afterSwapRebateWETH-initialRebateWETH;
    console.log(`operator2收到了 ${ethers.formatUnits(rebateWETHDiff, 18)} WETH作为反佣`);
    
    // 获取operator3当前的USDT余额
    const operator3UsdtBalance = await usdt.balanceOf(operator3Address);
    console.log(`operator3的USDT余额: ${ethers.formatUnits(operator3UsdtBalance, 18)} USDT`);
    
    // 步骤6-1: 用swapExactTokensForETH方法将1/3的USDT兑换回ETH
    console.log("\n步骤6-1: operator3使用swapExactTokensForETH将部分USDT兑换回ETH");
    
    // 计算1/3的USDT余额
    const firstSwapAmount = operator3UsdtBalance / 3n;
    
    // 授权热交易路由使用operator3的USDT/weth
    await usdt.connect(operator3).approve(hotRouterEnhancedAddress, firstSwapAmount);
    await weth.connect(operator3).approve(hotRouterEnhancedAddress, ethers.parseUnits("100", 18));
    
    // 设置反向交易路径
    const reversePath = [usdtAddress, wethAddress];
    
    // 记录交换前operator2的WETH反佣余额
    const initialRebateWETHForFirstSwap = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    // console.log(`初始operator2在WETH中的反佣: ${ethers.formatUnits(initialRebateWETHForFirstSwap, 18)} WETH`);
    
    // 记录交换前的ETH余额
    const ethBalanceBefore1 = await ethers.provider.getBalance(operator3Address);
    
    // 执行USDT兑换ETH操作 - 方法1: swapExactTokensForETH
    const txResponse1 = await hotRouterEnhanced.connect(operator3).swapExactTokensForETH(
      firstSwapAmount,
      0, // 接受任意数量的ETH输出
      reversePath,
      poolTypePath,
      feePath,
      operator3Address,
      deadline
    );
    
    // 等待交易确认
    await txResponse1.wait();

    // 计算用户兑换回了多少ETH
    const ethBalanceAfter1 = await ethers.provider.getBalance(operator3Address);
    const ethReceived1 = ethBalanceAfter1 - ethBalanceBefore1;
    
    console.log(`方法1: operator3将 ${ethers.formatUnits(firstSwapAmount, 18)} USDT兑换回 ${ethers.formatUnits(ethReceived1, 18)} ETH`);
    
    // 检查USDT兑换ETH后operator2获得的反佣
    const afterFirstSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    // console.log(`方法1后，operator2的反佣: ${ethers.formatUnits(afterFirstSwapRebateWETH, 18)} WETH`);
    
    const rebateWETHDiff1 = afterFirstSwapRebateWETH - initialRebateWETHForFirstSwap;
    console.log(`operator2收到了 ${ethers.formatUnits(rebateWETHDiff1, 18)} WETH作为反佣`);
    
    // 步骤6-2: 用swapTokensForExactETH方法将1/2的剩余USDT兑换回固定数量的ETH
    console.log("\n步骤6-2: operator3使用swapTokensForExactETH将部分USDT兑换回ETH");
    
    // 获取更新后的USDT余额
    const remainingUsdtBalance = await usdt.balanceOf(operator3Address);
    const secondSwapAmount = remainingUsdtBalance / 2n;
    
    // 设定期望获得的ETH数量（这里设为0.05 ETH）
    const exactEthAmount = ethers.parseUnits("0.05", 18);
    
    // 授权热交易路由使用operator3的USDT
    await usdt.connect(operator3).approve(hotRouterEnhancedAddress, secondSwapAmount);
    
    // 记录交换前operator2的WETH反佣余额
    const initialRebateWETHForSecondSwap = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    // console.log(`初始operator2在WETH中的反佣: ${ethers.formatUnits(initialRebateWETHForSecondSwap, 18)} WETH`);
    
    // 记录交换前的ETH余额
    const ethBalanceBefore2 = await ethers.provider.getBalance(operator3Address);
    
    // 执行USDT兑换ETH操作 - 方法2: swapTokensForExactETH
    const txResponse2 = await hotRouterEnhanced.connect(operator3).swapTokensForExactETH(
      exactEthAmount,       // 期望获得的确切ETH数量
      secondSwapAmount,     // 最大USDT输入量
      reversePath,
      poolTypePath,
      feePath,
      operator3Address,
      deadline
    );
    
    // 等待交易确认
    const txReceipt2 = await txResponse2.wait();
    
    // 计算用户兑换回了多少ETH（应该接近exactEthAmount）
    const ethBalanceAfter2 = await ethers.provider.getBalance(operator3Address);
    const ethReceived2 = ethBalanceAfter2 - ethBalanceBefore2;
    
    // 计算实际使用了多少USDT
    const usdtBalanceAfter2 = await usdt.balanceOf(operator3Address);
    const usdtUsed2 = remainingUsdtBalance - usdtBalanceAfter2;
    
    console.log(`方法2: operator3将 ${ethers.formatUnits(usdtUsed2, 18)} USDT兑换回 ${ethers.formatUnits(ethReceived2, 18)} ETH`);
    
    // 检查USDT兑换ETH后operator2获得的反佣
    const afterSecondSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    // console.log(`方法2后，operator2的反佣: ${ethers.formatUnits(afterSecondSwapRebateWETH, 18)} WETH`);
    
    const rebateWETHDiff2 = afterSecondSwapRebateWETH - initialRebateWETHForSecondSwap;
    console.log(`operator2收到了 ${ethers.formatUnits(rebateWETHDiff2, 18)} WETH作为反佣`);
    
    // 步骤6-3: 用swapExactTokensForETHSupportingFeeOnTransferTokens方法将剩余所有USDT兑换回ETH
    console.log("\n步骤6-3: operator3使用swapExactTokensForETHSupportingFeeOnTransferTokens将剩余USDT兑换回ETH");
    
    // 获取最终剩余的USDT余额
    const finalUsdtBalance = await usdt.balanceOf(operator3Address);
    
    // 授权热交易路由使用operator3的USDT
    await usdt.connect(operator3).approve(hotRouterEnhancedAddress, finalUsdtBalance);
    
    // 记录交换前operator2的WETH反佣余额
    const initialRebateWETHForFinalSwap = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    // 记录交换前的ETH余额
    const ethBalanceBefore3 = await ethers.provider.getBalance(operator3Address);
    
    // 执行USDT兑换ETH操作 - 方法3: swapExactTokensForETHSupportingFeeOnTransferTokens
    const txResponse3 = await hotRouterEnhanced.connect(operator3).swapExactTokensForETHSupportingFeeOnTransferTokens(
      finalUsdtBalance,
      0, // 接受任意数量的ETH输出
      reversePath,
      poolTypePath,
      feePath,
      operator3Address,
      deadline
    );
    
    // 等待交易确认
    const txReceipt3 = await txResponse3.wait();
    
    // 计算用户兑换回了多少ETH
    const ethBalanceAfter3 = await ethers.provider.getBalance(operator3Address);
    const ethReceived3 = ethBalanceAfter3 - ethBalanceBefore3;
    
    console.log(`方法3: operator3将 ${ethers.formatUnits(finalUsdtBalance, 18)} USDT兑换回 ${ethers.formatUnits(ethReceived3, 18)} ETH`);
    
    // 步骤7: 检查所有USDT兑换ETH后operator2获得的总反佣
    const finalRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);

    const ThirdRebateWETHDiff = finalRebateWETH - initialRebateWETHForFinalSwap;
    console.log(`operator2在第三方笔中总共收到了 ${ethers.formatUnits(ThirdRebateWETHDiff, 18)} WETH作为反佣`);
    console.log("\n步骤7: 检查operator2在所有交易后的总反佣");

    const totalRebateWETHDiff = finalRebateWETH - initialRebateWETH;
    console.log(`operator2在所有交易中总共收到了 ${ethers.formatUnits(totalRebateWETHDiff, 18)} WETH作为反佣\n\n`);

  });

  // 流动性添加和撤回测试
  it.skip("Should add liquidity, test rebate system, and remove liquidity", async function() {
    this.timeout(300000); // 设置5分钟超时

    console.log("\n--- 测试流动性添加和撤回 ---");

    // 步骤1: 为operator1提供USDT并添加流动性
    console.log("步骤1: operator1添加ETH和USDT流动性");
    
    // 向operator1转移USDT代币
    const tokenAmount = ethers.parseUnits(SWAP_PARAMS.USDT_AMOUNT, 18);
    await usdt.connect(deployer).transfer(operator1Address, tokenAmount);
    console.log(`向operator1转移了 ${ethers.formatUnits(tokenAmount, 18)} USDT`);
    
    // 授权温和交易路由使用operator1的USDT
    await usdt.connect(operator1).approve(warmRouterOriginalAddress, tokenAmount);
    
    // 准备添加流动性参数
    const deadline = Math.floor(Date.now() / 1000) + SWAP_PARAMS.DEADLINE_MINUTES * 60;
    const addLiquidityETHCmd = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint", "uint", "uint", "uint8"],
      [tokenAmount, 0, 0, SWAP_PARAMS.SWAP_N] // 参数: USDT数量, 最小USDT, 最小ETH, 池子类型
    );
    
    // 执行添加流动性操作
    const ethAmount = ethers.parseUnits("100", 18);
    const addLiqTx = await warmRouterOriginal.connect(operator1).addLiquidityETH(
      usdtAddress,
      addLiquidityETHCmd,
      operator1Address,
      deadline,
      SWAP_PARAMS.FEE, // 费率
      { value: ethAmount }
    );
    
    await addLiqTx.wait();
    console.log(`成功添加流动性: ${ethers.formatUnits(ethAmount, 18)} ETH 和 ${ethers.formatUnits(tokenAmount, 18)} USDT`);
    
    // 获取交易对信息
    const pairAddress = await factory.getPair(wethAddress, usdtAddress, SWAP_PARAMS.SWAP_POOL_TYPE, SWAP_PARAMS.FEE);
    console.log(`找到交易对地址: ${pairAddress}`);
    
    const pairABI = [
      "function getPoolType() external view returns (uint8)",
      "function getFee() external view returns (uint)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
      "function isPoolFeeOn() external view returns (uint)",
      "function balanceOf(address) external view returns (uint)"
    ];
    const pairContract = new ethers.Contract(pairAddress, pairABI, deployer);
    
    // 获取operator1的LP代币余额
    const lpBalance = await pairContract.balanceOf(operator1Address);
    console.log(`operator1持有的LP代币数量: ${ethers.formatUnits(lpBalance, 18)}`);
    
    // 步骤2: operator2铸造NFT
    console.log("\n步骤2: operator2 mint NFT");
    const mintCost = await nft.mintCost();
    await nft.connect(operator2).mint(1, { value: mintCost });
    
    // 步骤3: operator3领取operator2的NFT,建立推荐关系
    console.log("\n步骤3: operator3领取operator2的NFT");
    const claimCost = await nft.claimCost();
    await nft.connect(operator3).claim(operator2Address, { value: claimCost });
    
    // 验证推荐关系是否正确
    const [parent, grandParent] = await nft.getTwoParentAddress(operator3Address);
    console.log(`验证推荐关系: operator3的推荐人是 ${parent}`);
    
    // 获取交易对参数
    const actualPoolType = await pairContract.getPoolType();
    const actualFee = await pairContract.getFee();
    const poolTypePath = [actualPoolType];
    const feePath = [actualFee];
    
    // 步骤4: operator3用ETH兑换USDT
    console.log("\n步骤4: operator3用ETH兑换USDT");
    const swapAmount = ethers.parseUnits("100", 18);
    const path = [wethAddress, usdtAddress];
    
    // 检查交换前余额
    const usdtBalanceBefore = await usdt.balanceOf(operator3Address);
    
    // 记录operator2的初始反佣
    const initialRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    // 执行ETH兑换USDT操作
    await hotRouterEnhanced.connect(operator3).swapExactETHForTokens(
      SWAP_PARAMS.MIN_AMOUNT, // 接受任意数量的USDT输出
      path,
      poolTypePath,
      feePath,
      operator3Address,
      deadline,
      { value: swapAmount }
    );
    
    // 计算实际兑换获得的USDT数量
    const usdtBalanceAfter = await usdt.balanceOf(operator3Address);
    const usdtReceived = usdtBalanceAfter - usdtBalanceBefore;
    console.log(`operator3兑换了 ${ethers.formatUnits(swapAmount, 18)} ETH为 ${ethers.formatUnits(usdtReceived, 18)} USDT`);
    
    // 步骤5: 检查ETH兑换USDT后operator2获得的反佣
    console.log("\n步骤5: 检查operator2在ETH->USDT交换后的反佣");
    const afterSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    const rebateWETHDiff = afterSwapRebateWETH - initialRebateWETH;
    console.log(`operator2收到了 ${ethers.formatUnits(rebateWETHDiff, 18)} WETH作为反佣`);
    
    // 步骤6: 将所有USDT兑换回ETH
    console.log("\n步骤6: operator3将所有USDT兑换回ETH");
    
    // 获取operator3当前的USDT余额
    const operator3UsdtBalance = await usdt.balanceOf(operator3Address);
    console.log(`operator3的USDT余额: ${ethers.formatUnits(operator3UsdtBalance, 18)} USDT`);
    
    // 授权热交易路由使用operator3的USDT
    await usdt.connect(operator3).approve(hotRouterEnhancedAddress, operator3UsdtBalance);
    await weth.connect(operator3).approve(hotRouterEnhancedAddress, ethers.parseUnits("5000", 18));
    // 设置反向交易路径
    const reversePath = [usdtAddress, wethAddress];
    
    // 记录交换前operator2的WETH反佣余额
    const beforeFinalSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    // 记录交换前的ETH余额
    const ethBalanceBefore = await ethers.provider.getBalance(operator3Address);
    
    // 执行USDT兑换ETH操作 - 使用swapExactTokensForETH
    const txResponse = await hotRouterEnhanced.connect(operator3).swapExactTokensForETH(
      operator3UsdtBalance,
      0, // 接受任意数量的ETH输出
      reversePath,
      poolTypePath,
      feePath,
      operator3Address,
      deadline
    );
    
    // 等待交易确认
    await txResponse.wait();

    // 计算用户兑换回了多少ETH
    const ethBalanceAfter = await ethers.provider.getBalance(operator3Address);
    // 注意: 这里的差额不准确，因为gas费用也从余额中扣除了
    const approximateEthReceived = ethBalanceAfter - ethBalanceBefore;
    
    console.log(`operator3将 ${ethers.formatUnits(operator3UsdtBalance, 18)} USDT兑换回了约 ${ethers.formatUnits(approximateEthReceived, 18)} ETH（不含gas费）`);
    
    // 步骤7: 检查所有交易后operator2获得的总反佣
    const finalRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    const totalRebateWETHDiff = finalRebateWETH - initialRebateWETH;
    
    console.log("\n步骤7: 检查operator2在所有交易后的总反佣");
    console.log(`operator2在回程交易中获得了 ${ethers.formatUnits(finalRebateWETH - beforeFinalSwapRebateWETH, 18)} WETH作为反佣`);
    console.log(`operator2在所有交易中总共收到了 ${ethers.formatUnits(totalRebateWETHDiff, 18)} WETH作为反佣`);
    
    // 步骤8: operator1撤出流动性
    console.log("\n步骤8: operator1撤出全部流动性");
    
    // 授权Router使用LP代币
    const pairERC20 = await ethers.getContractAt("contracts/protocol/CoinfairFactory.sol:CoinfairPair", pairAddress);
    await pairERC20.connect(operator1).approve(warmRouterOriginalAddress, lpBalance);
    
    // 记录撤出前的余额
    const operator1EthBalanceBefore = await ethers.provider.getBalance(operator1Address);
    const operator1UsdtBalanceBefore = await usdt.balanceOf(operator1Address);
    
    // 执行撤出流动性操作
    const removeLiqTx = await warmRouterOriginal.connect(operator1).removeLiquidityETH(
      usdtAddress,
      lpBalance,
      0, // 最小USDT输出
      0, // 最小ETH输出
      operator1Address,
      deadline,
      SWAP_PARAMS.SWAP_POOL_TYPE,
      SWAP_PARAMS.FEE
    );
    
    // 等待交易确认
    await removeLiqTx.wait();
    
    // 计算撤出后的余额变化
    const operator1EthBalanceAfter = await ethers.provider.getBalance(operator1Address);
    const operator1UsdtBalanceAfter = await usdt.balanceOf(operator1Address);
    
    const ethWithdrawn = operator1EthBalanceAfter - operator1EthBalanceBefore;
    const usdtWithdrawn = operator1UsdtBalanceAfter - operator1UsdtBalanceBefore;
    
    console.log(`撤出流动性后，operator1获得了约 ${ethers.formatUnits(ethWithdrawn, 18)} ETH（不含gas费）`);
    console.log(`撤出流动性后，operator1获得了 ${ethers.formatUnits(usdtWithdrawn, 18)} USDT`);
    
    // 验证LP代币余额为0
    const finalLpBalance = await pairContract.balanceOf(operator1Address);
    console.log(`operator1剩余的LP代币数量: ${ethers.formatUnits(finalLpBalance, 18)}`);
    
    console.log("\n--- 流动性测试完成 ---\n");
  });

  // 开启流动性费用后的反佣测试
  it("Should test the rebate system with liquidity fee on", async function() {
    this.timeout(300000); // 设置5分钟超时

    console.log("\n--- 测试开启流动性费用后的反佣系统 ---");

    // 步骤1: 为operator1提供USDT并添加流动性
    console.log("步骤1: operator1添加ETH和USDT流动性");
    
    // 向operator1转移USDT代币
    const tokenAmount = ethers.parseUnits(SWAP_PARAMS.USDT_AMOUNT, 18);
    await usdt.connect(deployer).transfer(operator1Address, tokenAmount);
    console.log(`向operator1转移了 ${ethers.formatUnits(tokenAmount, 18)} USDT`);
    
    // 授权温和交易路由使用operator1的USDT
    await usdt.connect(operator1).approve(warmRouterOriginalAddress, tokenAmount);
    
    // 准备添加流动性参数
    const deadline = Math.floor(Date.now() / 1000) + SWAP_PARAMS.DEADLINE_MINUTES * 60;
    const addLiquidityETHCmd = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint", "uint", "uint", "uint8"],
      [tokenAmount, 0, 0, SWAP_PARAMS.SWAP_N] // 参数: USDT数量, 最小USDT, 最小ETH, 池子类型
    );
    
    // 执行添加流动性操作
    const ethAmount = ethers.parseUnits("100", 18);
    const addLiqTx = await warmRouterOriginal.connect(operator1).addLiquidityETH(
      usdtAddress,
      addLiquidityETHCmd,
      operator1Address,
      deadline,
      SWAP_PARAMS.FEE, // 费率
      { value: ethAmount }
    );
    
    await addLiqTx.wait();
    console.log(`成功添加流动性: ${ethers.formatUnits(ethAmount, 18)} ETH 和 ${ethers.formatUnits(tokenAmount, 18)} USDT`);
    
    // 获取交易对信息
    const pairAddress = await factory.getPair(wethAddress, usdtAddress, SWAP_PARAMS.SWAP_POOL_TYPE, SWAP_PARAMS.FEE);
    console.log(`找到交易对地址: ${pairAddress}`);
    
    const pairABI = [
      "function getPoolType() external view returns (uint8)",
      "function getFee() external view returns (uint)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
      "function isPoolFeeOn() external view returns (uint)",
      "function balanceOf(address) external view returns (uint)"
    ];
    const pairContract = new ethers.Contract(pairAddress, pairABI, deployer);
    
    await treasury.connect(deployer).setRoolOver(pairAddress, true);

    // 获取operator1的LP代币余额
    const lpBalance = await pairContract.balanceOf(operator1Address);
    console.log(`operator1持有的LP代币数量: ${ethers.formatUnits(lpBalance, 18)}`);
    
    // 步骤2: operator2铸造NFT
    console.log("\n步骤2: operator2 mint NFT");
    const mintCost = await nft.mintCost();
    await nft.connect(operator2).mint(1, { value: mintCost });
    
    // 步骤3: operator3领取operator2的NFT,建立推荐关系
    console.log("\n步骤3: operator3领取operator2的NFT");
    const claimCost = await nft.claimCost();
    await nft.connect(operator3).claim(operator2Address, { value: claimCost });
    
    // 验证推荐关系是否正确
    const [parent, grandParent] = await nft.getTwoParentAddress(operator3Address);
    console.log(`验证推荐关系: operator3的推荐人是 ${parent}`);
    
    // 步骤4: 由deployer设置isPoolFeeOn为1
    console.log("\n步骤4: 设置交易对的isPoolFeeOn为1");
    await treasury.connect(deployer).setIsPoolFeeOn(pairAddress, 1);
    console.log(`已设置交易对 ${pairAddress} 的isPoolFeeOn为1`);
    
    // 获取交易对参数
    const actualPoolType = await pairContract.getPoolType();
    const actualFee = await pairContract.getFee();
    const poolTypePath = [actualPoolType];
    const feePath = [actualFee];
    
    // 步骤5: operator3用ETH兑换USDT
    console.log("\n步骤5: operator3用ETH兑换USDT");
    const swapAmount = ethers.parseUnits("1000", 18);
    const path = [wethAddress, usdtAddress];
    
    // 检查交换前余额
    const usdtBalanceBefore = await usdt.balanceOf(operator3Address);
    
    // 记录operator2的初始反佣
    const initialRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    // 执行ETH兑换USDT操作
    await hotRouterEnhanced.connect(operator3).swapExactETHForTokens(
      SWAP_PARAMS.MIN_AMOUNT, // 接受任意数量的USDT输出
      path,
      poolTypePath,
      feePath,
      operator3Address,
      deadline,
      { value: swapAmount }
    );

    // await treasury.connect(deployer).setIsPoolFeeOn(pairAddress, 0);
    // console.log(`已设置交易对 ${pairAddress} 的isPoolFeeOn为0`);
    
    // 计算实际兑换获得的USDT数量
    const usdtBalanceAfter = await usdt.balanceOf(operator3Address);
    const usdtReceived = usdtBalanceAfter - usdtBalanceBefore;
    console.log(`operator3兑换了 ${ethers.formatUnits(swapAmount, 18)} ETH为 ${ethers.formatUnits(usdtReceived, 18)} USDT`);
    
    // 步骤6: 检查ETH兑换USDT后operator2获得的反佣
    console.log("\n步骤6: 检查operator2在ETH->USDT交换后的反佣");
    const afterSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    const rebateWETHDiff = afterSwapRebateWETH - initialRebateWETH;
    console.log(`operator2收到了 ${ethers.formatUnits(rebateWETHDiff, 18)} WETH作为反佣`);
    
    // 步骤7: 将所有USDT兑换回ETH
    console.log("\n步骤7: operator3将所有USDT兑换回ETH");
    
    // 获取operator3当前的USDT余额
    const operator3UsdtBalance = await usdt.balanceOf(operator3Address);
    console.log(`operator3的USDT余额: ${ethers.formatUnits(operator3UsdtBalance, 18)} USDT`);
    
    // 授权热交易路由使用operator3的USDT
    await usdt.connect(operator3).approve(hotRouterEnhancedAddress, operator3UsdtBalance);
    await weth.connect(operator3).approve(hotRouterEnhancedAddress, ethers.parseUnits("5000", 18));
    // 设置反向交易路径
    const reversePath = [usdtAddress, wethAddress];
    
    // 记录交换前operator2的WETH反佣余额
    const beforeFinalSwapRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    
    // 记录交换前的ETH余额
    const ethBalanceBefore = await ethers.provider.getBalance(operator3Address);
    
    // 执行USDT兑换ETH操作 - 使用swapExactTokensForETH
    const txResponse = await hotRouterEnhanced.connect(operator3).swapExactTokensForETH(
      operator3UsdtBalance,
      0, // 接受任意数量的ETH输出
      reversePath,
      poolTypePath,
      feePath,
      operator3Address,
      deadline
    );
    
    // 等待交易确认
    await txResponse.wait();

    // 计算用户兑换回了多少ETH
    const ethBalanceAfter = await ethers.provider.getBalance(operator3Address);
    // 注意: 这里的差额不准确，因为gas费用也从余额中扣除了
    const approximateEthReceived = ethBalanceAfter - ethBalanceBefore;
    
    console.log(`operator3将 ${ethers.formatUnits(operator3UsdtBalance, 18)} USDT兑换回了约 ${ethers.formatUnits(approximateEthReceived, 18)} ETH（不含gas费）`);
    
    // 步骤8: 检查所有交易后operator2获得的总反佣
    const finalRebateWETH = await treasury.CoinfairUsrTreasury(operator2Address, wethAddress);
    const totalRebateWETHDiff = finalRebateWETH - initialRebateWETH;
    
    console.log("\n步骤8: 检查operator2在所有交易后的总反佣");
    console.log(`operator2在回程交易中获得了 ${ethers.formatUnits(finalRebateWETH - beforeFinalSwapRebateWETH, 18)} WETH作为反佣`);
    console.log(`operator2在所有交易中总共收到了 ${ethers.formatUnits(totalRebateWETHDiff, 18)} WETH作为反佣`);
    
    // 步骤9: 检查feeTo账户获得的LP代币
    // const feeToAddress = await factory.feeTo();
    // const feeToLpBalance = await pairContract.balanceOf(feeToAddress);
    
    // console.log("\n步骤9: 检查feeTo账户获得的LP代币");
    // console.log(`feeTo账户(${feeToAddress})获得了 ${ethers.formatUnits(feeToLpBalance, 18)} LP代币作为流动性费用`);
    
    // 步骤10: operator1撤出流动性
    console.log("\n步骤10: operator1撤出全部流动性");
    
    // 授权Router使用LP代币
    const pairERC20 = await ethers.getContractAt("contracts/protocol/CoinfairFactory.sol:CoinfairPair", pairAddress);
    await pairERC20.connect(operator1).approve(warmRouterOriginalAddress, lpBalance);
    
    // 记录撤出前的余额
    const operator1EthBalanceBefore = await ethers.provider.getBalance(operator1Address);
    const operator1UsdtBalanceBefore = await usdt.balanceOf(operator1Address);
    
    // 执行撤出流动性操作
    const removeLiqTx = await warmRouterOriginal.connect(operator1).removeLiquidityETH(
      usdtAddress,
      lpBalance,
      0, // 最小USDT输出
      0, // 最小ETH输出
      operator1Address,
      deadline,
      SWAP_PARAMS.SWAP_POOL_TYPE,
      SWAP_PARAMS.FEE
    );
    
    // 等待交易确认
    await removeLiqTx.wait();
    
    // 计算撤出后的余额变化
    const operator1EthBalanceAfter = await ethers.provider.getBalance(operator1Address);
    const operator1UsdtBalanceAfter = await usdt.balanceOf(operator1Address);
    
    const ethWithdrawn = operator1EthBalanceAfter - operator1EthBalanceBefore;
    const usdtWithdrawn = operator1UsdtBalanceAfter - operator1UsdtBalanceBefore;
    
    console.log(`撤出流动性后，operator1获得了约 ${ethers.formatUnits(ethWithdrawn, 18)} ETH（不含gas费）`);
    console.log(`撤出流动性后，operator1获得了 ${ethers.formatUnits(usdtWithdrawn, 18)} USDT`);
    
    // 验证LP代币余额为0
    const finalLpBalance = await pairContract.balanceOf(operator1Address);
    console.log(`operator1剩余的LP代币数量: ${ethers.formatUnits(finalLpBalance, 18)}`);
    
    console.log("\n--- 流动性费用测试完成 ---\n");
  });

  // 测试完成后的清理工作
  after(async function() {
    console.log("\nDeployment and testing completed!");
    console.log("\nDeployed contracts:");
    console.log({
      USDT: usdtAddress,
      WETH: wethAddress,
      Treasury: treasuryAddress,
      Factory: factoryAddress,
      LibraryOriginal: libraryOriginalAddress,
      LibraryEnhanced: libraryEnhancedAddress,
      HotRouterOriginal: hotRouterOriginalAddress,
      HotRouterEnhanced: hotRouterEnhancedAddress,
      WarmRouterOriginal: warmRouterOriginalAddress,
      WarmRouterEnhanced: warmRouterEnhancedAddress,
      NFT: nftAddress
    });
  });
});