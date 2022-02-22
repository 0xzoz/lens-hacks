import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
    LensHub,
    PostCreated,
    ProfileCreated,
    ProfileCreatorWhitelisted,
    FollowModuleWhitelisted,
    ReferenceModuleWhitelisted,
    CollectModuleWhitelisted,
    DispatcherSet,
    ProfileImageURISet,
    FollowNFTURISet,
    FollowModuleSet,
    CommentCreated,
    MirrorCreated,
    PostToFeedCreated,
    FollowNFTDeployed,
    Followed
} from "../generated/templates/LensHub/LensHub"
import { FeedCreated } from '../generated/Feed/Feed'
import { Comment, InboxItem, Post, FollowingEdge, Profile, SocialGraph, FollowNFT, FollowNFTContract as FollowNFTContractEntity, ProfileCreatorWhitelist, CollectModuleWhitelist, FollowModuleWhitelist, ReferenceModuleWhitelist, Mirror, User, Inbox, Feed, FeedPub } from "../generated/schema"
import { FollowNFT as FollowNFTContract } from '../generated/templates'

export function handleProfileCreated(event: ProfileCreated): void {
    let lensContract = LensHub.bind(event.address);
    let entity = Profile.load(event.params.profileId.toString());

    if (!entity) {
        entity = new Profile(event.params.profileId.toString());
        let profileData = lensContract.getProfile(event.params.profileId);

        entity.profileId = event.params.profileId;
        entity.creator = event.params.creator;
        entity.owner = event.params.to;
        entity.pubCount = profileData.pubCount;
        entity.followModule = profileData.followModule;
        // entity.followNFT = profileData.followNFT;
        entity.handle = profileData.handle.toString();
        entity.imageURI = profileData.imageURI.toString();
        entity.createdOn = event.params.timestamp;
        entity.followNFTURI = profileData.followNFTURI.toString();
        entity.followModuleReturnData = event.params.followModuleReturnData;
        entity.dispatcher = new Bytes(0x0000000000000000000000000000000000000000);
        entity.save();
    }

    // Create a user for this profile.
    let user = User.load(event.params.profileId.toString());

    if(!user) {
        user = new User(event.params.profileId.toString());
        let inbox = new Inbox(event.params.profileId.toString());
        inbox.save();
        user.inbox = inbox.id;
        user.profile = entity.id;
        user.save();
    }
};

export function handleCommentCreated(event: CommentCreated): void {

    let entity = Comment.load(event.transaction.hash.toString());

    if (!entity) {
        entity = new Comment(event.transaction.hash.toString());

        entity.profileId = event.params.profileId;
        entity.pubId = event.params.pubId;
        entity.contentURI = event.params.contentURI.toString();
        entity.profileIdPointed = event.params.profileIdPointed;
        entity.pubIdPointed = event.params.pubIdPointed;
        entity.collectModule = event.params.collectModule;
        entity.collectModuleReturnData = event.params.collectModuleReturnData;
        entity.referenceModule = event.params.referenceModule;
        entity.referenceModuleReturnData = event.params.referenceModuleReturnData;
        entity.timestamp = event.params.timestamp;
        entity.save();
    }

};

export function handleMirrorCreated(event: MirrorCreated): void {

    let entity = Mirror.load(event.transaction.hash.toString());

    if (!entity) {
        entity = new Mirror(event.transaction.hash.toString());

        entity.profileId = event.params.profileId;
        entity.pubId = event.params.pubId;
        entity.profileIdPointed = event.params.profileIdPointed;
        entity.pubIdPointed = event.params.pubIdPointed;
        entity.referenceModule = event.params.referenceModule;
        entity.referenceModuleReturnData = event.params.referenceModuleReturnData;
        entity.timestamp = event.params.timestamp;
        entity.save();
    }

};

export function handleFollowNFTDeployed(event: FollowNFTDeployed): void {
    let profileId = event.params.profileId;
    let followNFTAddress = event.params.followNFT;
    let timestamp = event.params.timestamp;

    let followNFT = FollowNFTContractEntity.load(followNFTAddress.toString());

    if(!followNFT) {
        followNFT = new FollowNFTContractEntity(followNFTAddress.toString());
        let profile = Profile.load(profileId.toString());
        if (!profile) {
            throw new Error("Profile not found")
        }
        followNFT.profile = profile.id;
        followNFT.deployedAt = timestamp;
        followNFT.address = followNFTAddress;
        followNFT.save();

        // Start tracking the Follow NFT contract.
        FollowNFTContract.create(followNFTAddress);
    }
}

import { log } from '@graphprotocol/graph-ts'

export function handleFollowed(event: Followed): void {
    // We don't care about follows from Ethereum accounts. Only profiles.
    // if (event.params.followedFromProfileIds.length == 0) {
    //     console.log('Ignoring Followed since it contains no profile metadata');
    //     return;
    // }
    log.debug(
        "{} {}",
        [
            event.params.profileIds.join(',').toString(),
            event.params.followedFromProfileIds.join(',').toString()
        ]
    );

    const fromProfileIds = event.params.followedFromProfileIds;
    const toProfileIds = event.params.profileIds;

    // Update the following array.
    for (let i = 0; i < fromProfileIds.length; i++) {
        const fromProfileId = fromProfileIds[i];
        // const user = User.load(fromProfile.toString());
        // if (user == null) {
        //     console.log("User not found");
        //     throw new Error("User not found");
        // }
        
        for (let j = 0; j < toProfileIds.length; j++) {
            const toProfileId = toProfileIds[j];
            let edgeId = ""
                .concat(fromProfileId.toString())
                .concat("_")
                .concat(toProfileId.toString());
            
            let edge = FollowingEdge.load(edgeId);
            
            if (edge == null) {
                edge = new FollowingEdge(edgeId);
                edge.from = fromProfileId.toString();
                edge.to = toProfileId.toString();
                edge.save();
            }
        }
    }

};

export function handlePostCreated(event: PostCreated): void {

    let entity = Post.load(event.transaction.hash.toHexString());

    if (!entity) {
        let entity = new Post(event.transaction.hash.toHexString());

        entity.pubId = event.params.pubId;
        entity.profileId = event.params.profileId.toString();
        entity.contentURI = event.params.contentURI;
        entity.collectModule = event.params.collectModule;
        entity.collectModuleReturnData = event.params.collectModuleReturnData;
        entity.referenceModule = event.params.referenceModule;
        entity.referenceModuleReturnData = event.params.referenceModuleReturnData;
        entity.timestamp = event.params.timestamp;

        entity.save();
    }


};

export function handleFeedCreated(event: FeedCreated): void {
    let feed = new Feed(event.params.feedId.toString())
    feed.name = "";
    feed.profile = event.params.profileId.toString();
    feed.owner = event.params.owner;
    feed.save();
}

export function handlePostToFeedCreated(event: PostToFeedCreated): void {
    let feed = Feed.load(event.params.profileId.toString());
    if (!feed) throw new Error("No feed found for profile")

    const feedProfile = Profile.load(feed.profile);
    if (!feedProfile) throw new Error("No profile found for feed")
    
    const followers = feedProfile.followers;
    
    const feedPub = new FeedPub(
        ""
        .concat(feed.id)
        .concat("_")
        .concat(event.params.pubId.toString())
    );
    feedPub.author = event.params.authorProfileId.toString();
    feedPub.createdAt = event.block.timestamp;
    feedPub.feed = feed.id;
    feedPub.pub = event.params.pubId.toString();
    feedPub.save();

    for(let i = 0; i < followers.length; i++) {
        // let user = User.load();
        let inbox = Inbox.load(followers[i]);
        if (!inbox) throw new Error("No inbox found for profile")
        
        let inboxItem = new InboxItem(
            ""
            .concat(followers[i])
            .concat("_")
            .concat(event.params.pubId.toString())
        );

        inboxItem.inbox = inbox.id;
        inboxItem.item = feedPub.id;
        inboxItem.save();
    }
}

export function handleProfileCreatorWhitelisted(event: ProfileCreatorWhitelisted): void {

    let entity = ProfileCreatorWhitelist.load(event.params.profileCreator.toHexString());

    if (!entity) {
        let entity = new ProfileCreatorWhitelist(event.params.profileCreator.toHexString());
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }
    else {
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }

};

export function handleFollowModuleWhitelisted(event: FollowModuleWhitelisted): void {

    let entity = FollowModuleWhitelist.load(event.params.followModule.toHexString());

    if (!entity) {
        let entity = new FollowModuleWhitelist(event.params.followModule.toHexString());
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }
    else {
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }

};

export function handleReferenceModuleWhitelisted(event: ReferenceModuleWhitelisted): void {

    let entity = ReferenceModuleWhitelist.load(event.params.referenceModule.toHexString());

    if (!entity) {
        let entity = new ReferenceModuleWhitelist(event.params.referenceModule.toHexString());
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }
    else {
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }

};

export function handleCollectModuleWhitelisted(event: CollectModuleWhitelisted): void {

    let entity = CollectModuleWhitelist.load(event.params.collectModule.toHexString());

    if (!entity) {
        let entity = new CollectModuleWhitelist(event.params.collectModule.toHexString());
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }
    else {
        entity.isWhitelisted = event.params.whitelisted;
        entity.lastUpdated = event.params.timestamp;
        entity.save();
    }

};

export function handleDispatcherSet(event: DispatcherSet): void {

    let entity = Profile.load(event.params.profileId.toString());

    if (entity) {
        entity.dispatcher = event.params.dispatcher;
        entity.save();
    }

};

export function handleProfileImageURISet(event: ProfileImageURISet): void {

    let entity = Profile.load(event.params.profileId.toString());

    if (entity) {
        entity.imageURI = event.params.imageURI;
        entity.save();
    }

};

export function handleFollowNFTURISet(event: FollowNFTURISet): void {

    let entity = Profile.load(event.params.profileId.toString());

    if (entity) {
        entity.followNFTURI = event.params.followNFTURI;
        entity.save();
    }

};

export function handleFollowModuleSet(event: FollowModuleSet): void {

    let entity = Profile.load(event.params.profileId.toString());

    if (entity) {
        entity.followModule = event.params.followModule;
        entity.followModuleReturnData = event.params.followModuleReturnData;
        entity.save();
    }

};