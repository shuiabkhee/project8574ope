#!/usr/bin/env node
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const RPC = process.env.BLOCKCHAIN_RPC_URL || process.env.VITE_BASE_TESTNET_RPC || 'https://sepolia.base.org';
const CHAIN_ID = process.env.BLOCKCHAIN_CHAIN_ID ? Number(process.env.BLOCKCHAIN_CHAIN_ID) : undefined;
const TX = process.env.LAST_ONCHAIN_TX || process.env.TX_HASH || '0x81ff37d200ade57f9a2e028001c5a9c2041b3e71b58623eb0c1c46346dc1044c';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  console.log('Using RPC:', RPC);
  console.log('Fetching receipt for', TX);

  const receipt = await provider.getTransactionReceipt(TX);
  if (!receipt) {
    console.error('No receipt found for TX', TX);
    process.exit(1);
  }

  console.log('BlockNumber:', receipt.blockNumber, 'Status:', receipt.status);

  // Minimal ABIs to decode expected events
  const ESCROW_ABI = [
    'event StakeLocked(address indexed user, address indexed token, uint256 indexed amount, uint256 votingPower)'
  ];
  const FACTORY_ABI = [
    'event ChallengeCreatedP2P(uint256 indexed challengeId, address indexed creator, address participant, address paymentToken, uint256 stakeAmount, uint256 pointsReward)',
    'event CreatorStakeLocked(uint256 indexed challengeId, address indexed user, uint256 amount)',
    'event ParticipantStakeLocked(uint256 indexed challengeId, address indexed user, uint256 amount)'
  ];

  const escrowIface = new ethers.Interface(ESCROW_ABI);
  const factoryIface = new ethers.Interface(FACTORY_ABI);

  const decoded = [];
  for (const log of receipt.logs) {
    let parsed = null;
    try {
      parsed = escrowIface.parseLog(log);
    } catch (e) {
      // ignore
    }
    if (!parsed) {
      try {
        parsed = factoryIface.parseLog(log);
      } catch (e) {}
    }

    const parsedArgs = parsed ? Array.from(parsed.args).map(a => (typeof a === 'bigint' ? a.toString() : a)) : null;
    const entry = {
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: receipt.blockNumber,
      transactionHash: receipt.transactionHash,
      parsed: parsed ? { name: parsed.name, signature: parsed.signature, args: parsedArgs } : null,
    };
    decoded.push(entry);
  }

  console.log(JSON.stringify({ tx: TX, block: receipt.blockNumber, decoded }, null, 2));
}

main().catch(e => {
  console.error('Failed to fetch/parse tx logs:', e);
  process.exit(1);
});
