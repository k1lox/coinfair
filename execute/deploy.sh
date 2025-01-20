#!/usr/bin/env bash
set -e

# config
source ../config/.env

echo "Step 1: build"
forge build

echo "Step 2: test"
forge test -vvv

echo "Step 3: deploy"

DEPLOYED_CONTRACT_ADDRESS=$(forge create \
  --rpc-url $RPC \
  --private-key $PK \
  ../protocol/src/Counter.sol:Counter \
  --broadcast \
  | grep "Deployed to" | awk '{print $3}')

../execute/print.sh

echo "CA: $DEPLOYED_CONTRACT_ADDRESS"

echo "Step 1: Read current number \n"

current_number=$(cast call $DEPLOYED_CONTRACT_ADDRESS "number()" --rpc-url $RPC)
echo "Current number: $current_number"

echo "Step 2: Set number to 10"
../execute/print.sh
cast send $DEPLOYED_CONTRACT_ADDRESS "setNumber(uint256)" 10 --rpc-url $RPC --private-key $PK
../execute/print.sh

echo "Step 3: Read updated number \n"

updated_number=$(cast call $DEPLOYED_CONTRACT_ADDRESS "number()" --rpc-url $RPC)
echo "Updated number: $updated_number"

echo "========== over =========="
