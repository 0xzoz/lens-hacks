import { Address } from '@graphprotocol/graph-ts'
import { FollowNFT, FollowNFTContract } from '../generated/schema';
import { Transfer } from '../generated/templates/FollowNFT/FollowNFT'

const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')

export function handleTransfer(event: Transfer): void {
    const followNFTContract = FollowNFTContract.load(event.address.toString());
    if (followNFTContract == null) {
        throw new Error("Follow NFT contract not found");
    }

    if (event.params.from == ZERO_ADDRESS) {
        // Mint.
        let nft = new FollowNFT(event.params.tokenId.toString());
        nft.owner = event.params.to;        
        nft.contract = followNFTContract.id;
        nft.save();

        // Update follower graph.
        // const followed = followNFTContract.profile;
    }

    // TODO: extra transfers
}

