#!/usr/bin/env node
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const RPC = process.env.BLOCKCHAIN_RPC_URL;
const CHAIN_ID = process.env.BLOCKCHAIN_CHAIN_ID ? Number(process.env.BLOCKCHAIN_CHAIN_ID) : undefined;
const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY;
const FACTORY = process.env.VITE_CHALLENGE_FACTORY_ADDRESS || process.env.CONTRACT_FACTORY_ADDRESS;

if (!RPC || !ADMIN_KEY || !FACTORY) {
  console.error('Missing required env vars (BLOCKCHAIN_RPC_URL, ADMIN_PRIVATE_KEY, CONTRACT_FACTORY_ADDRESS)');
  process.exit(1);
}

const CHALLENGE_FACTORY_ABI = [
  'function stakeAndCreateP2PChallenge(address participant, address paymentToken, uint256 stakeAmount, uint256 creatorSide, uint256 pointsReward, string metadataURI, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) payable returns (uint256)',
  'function acceptP2PChallenge(uint256 challengeId, uint256 participantSide, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) payable',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, CHAIN_ID);
  const admin = new ethers.Wallet(ADMIN_KEY, provider);
  const factory = new ethers.Contract(FACTORY, CHALLENGE_FACTORY_ABI, admin);

  const network = await provider.getNetwork();
  const balance = await provider.getBalance(admin.address);
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Admin: ${admin.address} — balance ${ethers.formatEther(balance)} ETH`);

  const stakeAmount = ethers.parseEther('0.0001'); // small test stake
  // PARTICIPANT env: if provided use it; if set to 'RANDOM' generate a random address; otherwise use zero address for open challenge
  let participant = ethers.ZeroAddress; // open challenge
  if (process.env.PARTICIPANT) {
    if (process.env.PARTICIPANT === 'RANDOM') {
      participant = ethers.Wallet.createRandom().address;
      console.log('Generated random participant address for direct challenge:', participant);
    } else {
      participant = process.env.PARTICIPANT;
    }
  }
  const paymentToken = ethers.ZeroAddress; // ETH
  const creatorSide = 0; // YES
  const pointsReward = 1;
  const metadataURI = 'ipfs://test-metadata';

  console.log('\nSimulating stakeAndCreateP2PChallenge via provider.call...');
  try {
    // Build transaction data and simulate via provider.call
    const data = factory.interface.encodeFunctionData('stakeAndCreateP2PChallenge', [
      participant,
      paymentToken,
      stakeAmount,
      creatorSide,
      pointsReward,
      metadataURI,
      0,
      0,
      ethers.ZeroHash,
      ethers.ZeroHash,
    ]);

    const callResult = await provider.call({ to: FACTORY, data, value: stakeAmount, from: admin.address });
    const decoded = factory.interface.decodeFunctionResult('stakeAndCreateP2PChallenge', callResult);
    const simulatedId = decoded[0];
    console.log('Simulated challengeId:', String(simulatedId));

    const gasEstimate = await provider.estimateGas({ to: FACTORY, from: admin.address, data, value: stakeAmount });
    console.log('Estimated gas:', gasEstimate.toString());

    // Ask user to confirm broadcasting
    console.log('\nTo broadcast this transaction run this script with the `--broadcast` flag.');
    if (process.argv.includes('--broadcast')) {
      if (balance < stakeAmount) {
        console.error('Insufficient ETH balance to broadcast the transaction. Aborting.');
        process.exit(1);
      }

      console.log('Broadcasting transaction...');
      const tx = await factory.stakeAndCreateP2PChallenge(
        participant,
        paymentToken,
        stakeAmount,
        creatorSide,
        pointsReward,
        metadataURI,
        0,
        0,
        ethers.ZeroHash,
        ethers.ZeroHash,
        { value: stakeAmount }
      );
      console.log('Tx hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Tx confirmed in block', receipt.blockNumber);
      // Note: the created challengeId may be emitted in an event; callStatic returned it earlier
    }
  } catch (err) {
    console.error('Simulation or broadcast failed:', err);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
