import React from 'react';
import { useConfirmAndStake } from '@/hooks/useConfirmAndStake';

interface Props {
  challengeId: number;
  role?: 'creator' | 'acceptor';
  stakeAmountWei?: string;
}

export const ConfirmAndStakeButton: React.FC<Props> = ({ 
  challengeId, 
  role = 'acceptor',
  stakeAmountWei 
}) => {
  const { isProcessing, confirmAndStake } = useConfirmAndStake();

  const handleClick = async () => {
    await confirmAndStake(challengeId, role);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className="btn btn-primary"
      aria-busy={isProcessing}
    >
      {isProcessing ? (
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Processing...</span>
        </span>
      ) : role === 'acceptor' ? 'Accept & Stake' : 'Confirm & Stake'}
    </button>
  );
};

export default ConfirmAndStakeButton;
