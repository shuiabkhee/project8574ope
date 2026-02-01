import { useState } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';

type Role = 'creator' | 'acceptor';

export function useConfirmAndStake() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const confirmAndStake = async (challengeId: number, role: Role = 'acceptor') => {
    setIsProcessing(true);
    const pendingToast = toast({ title: 'Preparing stake', description: 'Preparing transaction — confirm in your wallet...' });
    try {
      // Request prepared tx payload from backend
      const prepRes = await fetch(`/api/challenges/${challengeId}/prepare-stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!prepRes.ok) throw new Error(`Failed to prepare stake: ${prepRes.statusText}`);
      const payload = await prepRes.json();

      const { to, data, value, chainId } = payload;

      // Use injected provider if available
      const providerAny = (window as any).ethereum;
      if (!providerAny) throw new Error('No Web3 wallet detected. Please connect your wallet.');

      // Ensure wallet is on correct chain
      const desiredChainHex = '0x' + parseInt(String(chainId)).toString(16);
      const currentChain = await providerAny.request({ method: 'eth_chainId' });
      if (currentChain !== desiredChainHex) {
        try {
          await providerAny.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: desiredChainHex }] });
        } catch (switchErr: any) {
          // If chain not found, try to add (best-effort)
          throw new Error('Please switch your wallet to the required network and retry.');
        }
      }

      const web3Provider = new ethers.BrowserProvider(providerAny as any);
      const signer = await web3Provider.getSigner();

      // Build transaction
      const txRequest: any = {
        to,
        data,
      };
      if (value && value !== '0x0') {
        try {
          txRequest.value = BigInt(value);
        } catch (e) {
          // fallback: try parse as decimal
          txRequest.value = BigInt(Number(value));
        }
      }
      // Prefer using sendTransaction via signer
      const tx = await signer.sendTransaction(txRequest);
      // Update existing toast
      try {
        pendingToast.update({ title: 'Transaction submitted', description: `Tx ${tx.hash}` });
      } catch (e) {}

      // Wait for a single confirmation (optional)
      await tx.wait(1);

      // Inform backend about transaction hash
      const notifyEndpoint = role === 'acceptor' ? `/api/challenges/${challengeId}/accept-stake` : `/api/challenges/${challengeId}/creator-confirm-stake`;
      const recordRes = await fetch(notifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHash: tx.hash }),
      });

      if (!recordRes.ok) {
        const txt = await recordRes.text();
        throw new Error(`Failed to record tx: ${txt}`);
      }

      try {
        pendingToast.update({ title: 'Stake recorded', description: 'Your stake was recorded on the server.', variant: 'success' });
        // Auto-dismiss after short delay
        setTimeout(() => pendingToast.dismiss(), 3000);
      } catch (e) {}
      setIsProcessing(false);
      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error('Confirm & stake failed:', error);
      try {
        pendingToast.update({ title: 'Stake failed', description: error.message || String(error), variant: 'destructive' });
        setTimeout(() => pendingToast.dismiss(), 5000);
      } catch (e) {
        toast({ title: 'Stake failed', description: error.message || String(error), variant: 'destructive' });
      }
      setIsProcessing(false);
      return { success: false, error: error.message };
    }
  };

  return { isProcessing, confirmAndStake } as const;
}
