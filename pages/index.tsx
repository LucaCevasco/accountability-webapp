import { ConnectWallet, useAddress, useContract, useContractRead, Web3Button } from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { ACCOUNTABILITY_CONTRACT_ADDRESS } from "../constants/contractAddresses";

const Home: NextPage = () => {
  const address = useAddress();
  const { data: discordAuthData, status: discordAuthStatus } = useSession();
  const { contract } = useContract(ACCOUNTABILITY_CONTRACT_ADDRESS);
  const [form, setForm] = useState({
    amount: '0',
    lockedFor: '0'
  });
  const { data: lockedFundsData, isLoading, error } = useContractRead(contract, 'lockedFunds', address);

  if (!address) {
    return (
      <div className='bg-gray-600 h-screen p-4'>
        <h1 className="text-4xl mb-2 text-white">Commit to a goal and lock up your funds to ensure you do it</h1>
        <div className="w-1/3">
          <ConnectWallet />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-gray-600 h-screen p-4'>
        <h1 className="text-4xl mb-2 text-white">Commit to a goal and lock up your funds to ensure you do it</h1>
        <div className="w-1/3">
          <ConnectWallet />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='bg-gray-600 h-screen p-4'>
        <p>Loading...</p>
      </div>
    )
  }

  if (lockedFundsData.amount.eq(0)) {
    return (
      <div className='bg-gray-600 h-screen p-4'>
        <h1 className="text-4xl mb-2 text-white">Commit to a goal and lock up your funds to ensure you do it</h1>
        <div className="w-1/3">
          <ConnectWallet />
        </div>
        {/* form that allows users to lock funds for x amount of time */}
        <input type='text'
          className="bg-gray-800 rounded p-2 mt-2"
          placeholder="Amount to lock"
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input type='text'
          className="bg-gray-800 rounded p-2 mt-2"
          placeholder="Locked for (in days)"
          onChange={(e) => setForm({ ...form, lockedFor: e.target.value })}
        />
        <Web3Button
          contractAddress={ACCOUNTABILITY_CONTRACT_ADDRESS}
          action={(contract) => contract.call('deposit', BigNumber.from(Number(form.lockedFor) * 86400), { value: ethers.utils.parseEther(form.amount) })}
          onSuccess={() => alert('success')}
          onError={() => alert('error')}
        >
          Lock funds
        </Web3Button>
      </div>
    )
  }

  const dateForUnlock = BigNumber.from(lockedFundsData.lockedAt).eq(0) ? 'You dont have locked up funds yet' : new Date(BigNumber.from(lockedFundsData.lockedAt).add(lockedFundsData.lockedFor).toNumber() * 1000).toLocaleString();
  const amountLocked = ethers.utils.formatEther(lockedFundsData.amount);
  const isDiscordConnected = discordAuthStatus === 'authenticated';
  const canUnlock = isDiscordConnected && BigNumber.from(lockedFundsData.lockedAt).add(lockedFundsData.lockedFor).lt(BigNumber.from(Date.now().toFixed()).div(1000));

  const attemptWithdraw = async (contract: any) => {
    contract.call('withdraw');
  };

  return (
    <div className='bg-gray-600 h-screen p-4'>
      <h1 className="text-4xl mb-2 text-white">Commit to a goal and lock up your funds to ensure you do it</h1>
      <div className="w-1/3">
        <ConnectWallet />
      </div>
      {
        isLoading ? <p>Loading...</p> : (
          <div className="mt-4">
            <p className="text-white">Locked funds: {amountLocked} MATIC</p>
            <p className="text-white">Locked until: {dateForUnlock}</p>
          </div>
        )
      }
      {
        canUnlock ? (
          <Web3Button
            contractAddress={ACCOUNTABILITY_CONTRACT_ADDRESS}
            action={attemptWithdraw}
          >
            Withdraw funds
          </Web3Button>
        ) : <p className="text-cyan-300">You are not ready to withdraw yet</p>
      }
      {
        !isDiscordConnected && (
          <>
            <p>You need to connect your discord account to unlock funds</p>
            <button className="bg-violet-500 rounded p-2 mt-2" onClick={() => signIn('discord')}>
              Connect Discord
            </button>
          </>
        )
      }
    </div>
  );
};

export default Home;
