import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash, type WriteContractParameters } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { TOKEN_ABI } from "@/abis";

// Query interfaces
interface TokenVesting {
  totalVested: bigint;
  vestedAmount: bigint;
  claimedAmount: bigint;
  availableToClaim: bigint;
  vestingStart: bigint;
  vestingEnd: bigint;
  vestingDuration: bigint;
  teamAllocation: bigint;
  nextClaimDate?: bigint;
  percentageVested: number;
  percentageClaimed: number;
  isFullyVested: boolean;
  isFullyClaimed: boolean;
}

interface BurnStats {
  totalBurned: bigint;
  totalSupply: bigint;
  maximumSupply: bigint;
  circulatingSupply: bigint;
  burnedPercentage: number;
}

interface MintRights {
  isMinter: boolean;
  isOwner: boolean;
  minter: Address;
  owner: Address;
  pendingOwner: Address | null;
  mintingEndTime: bigint;
  mintingEnabled: boolean;
}

// Mutation interfaces
interface BurnParams {
  amount: bigint;
}

interface SetMinterParams {
  minter: Address;
}

interface TransferOwnershipParams {
  newOwner: Address;
}

interface MintParams {
  to: Address;
  amount: bigint;
}

// Main hook
export function usePonderToken(
  account: Address | undefined,
  enabled = true
): {
  vesting: UseQueryResult<TokenVesting>;
  burnStats: UseQueryResult<BurnStats>;
  mintRights: UseQueryResult<MintRights>;
  burn: UseMutationResult<Hash, Error, BurnParams>;
  setMinter: UseMutationResult<Hash, Error, SetMinterParams>;
  transferOwnership: UseMutationResult<Hash, Error, TransferOwnershipParams>;
  mint: UseMutationResult<Hash, Error, MintParams>;
} {
  const sdk = usePonderSDK();

  // Query vesting info
  const vesting = useQuery({
    queryKey: ["ponder", "token", "vesting", account],
    queryFn: async () => {
      const [deploymentTime, teamTokensClaimed, totalSupply] =
        await Promise.all([
          sdk.ponder.deploymentTime(),
          sdk.ponder.teamTokensClaimed(),
          sdk.ponder.totalSupply(),
        ]);

      const now = BigInt(Math.floor(Date.now() / 1000));
      const vestingStart = deploymentTime;
      const vestingDuration = sdk.ponder.VESTING_DURATION;
      const vestingEnd = vestingStart + vestingDuration;
      const teamAllocation = sdk.ponder.TEAM_ALLOCATION;
      const timeElapsed = now - vestingStart;

      // Calculate vested amount
      const vestedAmount =
        timeElapsed >= vestingDuration
          ? teamAllocation
          : (teamAllocation * timeElapsed) / vestingDuration;

      const availableToClaim =
        vestedAmount > teamTokensClaimed
          ? vestedAmount - teamTokensClaimed
          : 0n;

      // Calculate next claim date if not fully vested
      const nextClaimDate =
        now >= vestingEnd
          ? undefined
          : vestingStart + (timeElapsed / 86400n + 1n) * 86400n;

      return {
        totalVested: teamAllocation,
        vestedAmount,
        claimedAmount: teamTokensClaimed,
        availableToClaim,
        vestingStart,
        vestingEnd,
        vestingDuration,
        teamAllocation,
        nextClaimDate,
        percentageVested:
          Number((vestedAmount * 10000n) / teamAllocation) / 100,
        percentageClaimed:
          Number((teamTokensClaimed * 10000n) / teamAllocation) / 100,
        isFullyVested: now >= vestingEnd,
        isFullyClaimed: teamTokensClaimed >= teamAllocation,
      };
    },
    enabled: enabled && !!account,
    staleTime: 30_000, // 30 seconds
  });

  // Query burn stats
  const burnStats = useQuery({
    queryKey: ["ponder", "token", "burns"],
    queryFn: async () => {
      const [totalBurned, totalSupply] = await Promise.all([
        sdk.ponder.totalBurned(),
        sdk.ponder.totalSupply(),
      ]);

      const maximumSupply = sdk.ponder.MAXIMUM_SUPPLY;
      const circulatingSupply = totalSupply - totalBurned;
      const burnedPercentage =
        Number((totalBurned * 10000n) / maximumSupply) / 100;

      return {
        totalBurned,
        totalSupply,
        maximumSupply,
        circulatingSupply,
        burnedPercentage,
      };
    },
    enabled,
    staleTime: 30_000,
  });

  // Query minting rights info
  const mintRights = useQuery({
    queryKey: ["ponder", "token", "mintRights", account],
    queryFn: async () => {
      if (!account) throw new Error("Account required");

      const [minter, owner, pendingOwner, deploymentTime] = await Promise.all([
        sdk.ponder.minter(),
        sdk.ponder.owner(),
        sdk.ponder.pendingOwner(),
        sdk.ponder.deploymentTime(),
      ]);

      const now = BigInt(Math.floor(Date.now() / 1000));
      const mintingEndTime = deploymentTime + sdk.ponder.MINTING_END;
      const mintingEnabled = now <= mintingEndTime;

      return {
        isMinter: account.toLowerCase() === minter.toLowerCase(),
        isOwner: account.toLowerCase() === owner.toLowerCase(),
        minter,
        owner,
        pendingOwner:
          pendingOwner === "0x0000000000000000000000000000000000000000"
            ? null
            : pendingOwner,
        mintingEndTime,
        mintingEnabled,
      };
    },
    enabled: enabled && !!account,
    staleTime: 30_000,
  });

  // Burn tokens mutation
  const burn = useMutation({
    mutationFn: async ({ amount }: BurnParams) => {
      if (!sdk.walletClient?.account) throw new Error("Wallet not connected");

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.ponder.address,
        abi: TOKEN_ABI,
        functionName: "burn",
        args: [amount],
        account: sdk.walletClient.account.address,
        chain: sdk.walletClient.chain,
      });

      return sdk.walletClient.writeContract(request as WriteContractParameters);
    },
  });

  // Set minter mutation
  const setMinter = useMutation({
    mutationFn: async ({ minter }: SetMinterParams) => {
      if (!sdk.walletClient?.account) throw new Error("Wallet not connected");

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.ponder.address,
        abi: TOKEN_ABI,
        functionName: "setMinter",
        args: [minter],
        account: sdk.walletClient.account.address,
        chain: sdk.walletClient.chain,
      });

      return sdk.walletClient.writeContract(request as WriteContractParameters);
    },
  });

  // Transfer ownership mutation
  const transferOwnership = useMutation({
    mutationFn: async ({ newOwner }: TransferOwnershipParams) => {
      if (!sdk.walletClient?.account) throw new Error("Wallet not connected");

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.ponder.address,
        abi: TOKEN_ABI,
        functionName: "transferOwnership",
        args: [newOwner],
        account: sdk.walletClient.account.address,
        chain: sdk.walletClient.chain,
      });

      return sdk.walletClient.writeContract(request as WriteContractParameters);
    },
  });

  // Mint tokens mutation
  const mint = useMutation({
    mutationFn: async ({ to, amount }: MintParams) => {
      if (!sdk.walletClient?.account) throw new Error("Wallet not connected");

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.ponder.address,
        abi: TOKEN_ABI,
        functionName: "mint",
        args: [to, amount],
        account: sdk.walletClient.account.address,
        chain: sdk.walletClient.chain,
      });

      return sdk.walletClient.writeContract(request as WriteContractParameters);
    },
  });

  return {
    vesting,
    burnStats,
    mintRights,
    burn,
    setMinter,
    transferOwnership,
    mint,
  };
}
