import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Coins, AlertCircle } from "lucide-react";

interface AcceptChallengeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  challengeTitle: string;
  amount: string;
  isProcessing: boolean;
}

export function AcceptChallengeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  challengeTitle,
  amount,
  isProcessing,
}: AcceptChallengeConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Accept Challenge
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500 dark:text-slate-400">
            You are about to accept the challenge:
            <span className="block font-semibold text-slate-900 dark:text-slate-100 mt-1">
              "{challengeTitle}"
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Required Stake</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>{amount}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your stake will be locked in a secure escrow contract on-chain. It will only be released to the winner once the challenge is resolved.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Once staked, funds cannot be withdrawn until a result is reached or a dispute is settled.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-xl h-11 font-semibold"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-semibold shadow-lg shadow-emerald-600/20"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Staking...</span>
              </div>
            ) : (
              "Confirm & Stake"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
