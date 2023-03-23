// this is a typescript nextjs api route

import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { BigNumber } from 'ethers';
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth';
import { ACCOUNTABILITY_CONTRACT_ADDRESS, CHAIN, DISCORD_CHANNEL_ID, DISCORD_SERVER_ID, NFT_COLLECTION_ADDRESS } from '../../constants/contractAddresses';
import { authOptions } from './auth/[...nextauth]';

export default async function withdraw(req: NextApiRequest, res: NextApiResponse) {
  const { userAddress } = req.body;
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  };

  if (!userAddress) {
    res.status(400).json({ error: 'Missing user address' });
    return;
  }

  const sdk = new ThirdwebSDK(CHAIN);

  // find out how many days the user commited for
  const accountabilityContract = await sdk.getContract(ACCOUNTABILITY_CONTRACT_ADDRESS);

  const lockedFundsStruct = await accountabilityContract.call("lockedFunds", userAddress);
  const daysCommited = BigNumber.from(lockedFundsStruct.lockedFor).div(BigNumber.from(86400));

  // ask the question to discord API
  // did the user send a message to the server every 24 hours for the number of days they commited for?

  const messages = await fetch(`https://discord.com/api/v9/channels/${DISCORD_CHANNEL_ID}/messages`, {
    headers: {
      Authorization: `Bot ${process.env.BOT_TOKEN}`,
    },
  }).then(res => res.json());

  // @ts-ignore
  const filterMessages = messages.filter((message: any) => message.author.id === session.userId);
  // check if the user sent a message every 24 hours for the number of days they commited for
  const didSendMessageDaily = filterMessages.every((message: any, index: number) => {
    const previousMessageTimestamp = new Date(filterMessages[index - 1]?.timestamp).getTime() / 1000;
    const currentMessageTimestamp = new Date(message.timestamp).getTime() / 1000;

    return currentMessageTimestamp - previousMessageTimestamp > 86400 / 3;
  });

  // if they did... then generate a mint signature for them an return it.
  if (didSendMessageDaily && filterMessages.length === daysCommited.toNumber()) {
    const nftCollection = await sdk.getContract(NFT_COLLECTION_ADDRESS);
    const signature = await nftCollection.erc721.signature.generate({
      metadata: {
        name: session.user?.name,
        description: 'For comitting to your goals',
        image: session.user?.image,
      },
      to: userAddress,
    });
    return res.status(200).json({ signature });
  }
  // if they did not, retgurn an error message
  return res.status(400).json({ error: 'You did not send a message every 24 hours for the number of days you commited for' });
};