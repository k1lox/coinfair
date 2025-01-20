#!/usr/bin/env bash
set -e

# config
source ../config/.env

forge install OpenZeppelin/openzeppelin-contracts --no-commit
# forge clean
forge build

CF_TREASURY=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/CoinfairTreasury.sol:CoinfairTreasury \
  --broadcast \
  --use 0.6.6 \
  | grep "Deployed to" | awk '{print $3}')

echo -e "\nCA(Treasury): $CF_TREASURY \n"

CF_FACTORY=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/CoinfairFactory.sol:CoinfairFactory \
  --broadcast \
  --constructor-args $CF_TREASURY \
  --use 0.5.16 \
  | grep "Deployed to" | awk '{print $3}')

echo -e "CA(Factory): $CF_FACTORY \n"

INIT_CODE_PAIR_HASH=$(cast call $CF_FACTORY "INIT_CODE_PAIR_HASH()" --rpc-url $RPC)
echo -e "INIT_CODE: $INIT_CODE_PAIR_HASH\n"

CF_LIB=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/CoinfairRouter.sol:CoinfairLibrary \
  --broadcast \
  --use 0.6.6 \
  | grep "Deployed to" | awk '{print $3}')

echo -e "CA(Library): $CF_LIB \n"

CF_HOT=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/CoinfairRouter.sol:CoinfairHotRouter \
  --broadcast \
  --libraries ../protocol/src/CoinfairRouter.sol:CoinfairLibrary:$CF_LIB \
  --constructor-args $CF_FACTORY \
  --use 0.6.6 \
  | grep "Deployed to" | awk '{print $3}')

echo -e "CA(Hot): $CF_HOT \n"

CF_WARM=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/CoinfairRouter.sol:CoinfairWarmRouter \
  --broadcast \
  --libraries ../protocol/src/CoinfairRouter.sol:CoinfairLibrary:$CF_LIB \
  --constructor-args $CF_FACTORY \
  --use 0.6.6 \
  | grep "Deployed to" | awk '{print $3}')

echo -e "CA(Warm): $CF_WARM \n"

HASH=$(cast send $CF_FACTORY "setRouterAddress(address,address)" $CF_HOT $CF_WARM --rpc-url $RPC --private-key $PK)
transaction_hash=$(echo "$HASH" | grep "transactionHash" | awk '{print $2}')
echo -e "Transaction Hash: $transaction_hash\n"
# HOT=$(cast call $CF_FACTORY "hotRouterAddress()" --rpc-url $RPC)
# echo -e "\nCA(HOT_FROM_FAC): $(cast parse-bytes32-address $HOT) \n"
# WARM=$(cast call $CF_FACTORY "warmRouterAddress()" --rpc-url $RPC)
# echo -e "CA(WARM_FROM_FAC): $(cast parse-bytes32-address $WARM) \n"

CF_NFT=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/CoinfairNFT.sol:CoinfairNFT \
  --broadcast \
  --use 0.8.24 \
  | grep "Deployed to" | awk '{print $3}')
echo -e "CA(Nft): $CF_NFT \n"

HASH=$(cast send $CF_TREASURY "setDEXAddress(address,address,address)" $CF_FACTORY $CF_NFT $CF_WARM --rpc-url $RPC --private-key $PK)
transaction_hash=$(echo "$HASH" | grep "transactionHash" | awk '{print $2}')
echo -e "Transaction Hash: $transaction_hash\n"

# CoinfairWarmRouterAddress=$(cast call $CF_TREASURY "CoinfairWarmRouterAddress()" --rpc-url $RPC)
# echo -e "\nCA(CoinfairWarmRouterAddress): $(cast parse-bytes32-address $CoinfairWarmRouterAddress) \n"

../execute/print.sh

echo "========== over =========="


# cast send $DEPLOYED_CONTRACT_ADDRESS "setNumber(uint256)" 10 --rpc-url $RPC --private-key $PK
# ../execute/print.sh

# echo "Step 3: Read updated number \n"

# updated_number=$(cast call $DEPLOYED_CONTRACT_ADDRESS "number()" --rpc-url $RPC)
# echo "Updated number: $updated_number"
