## Entities

```
Inbox
    user: User
    items: FeedPub[]
    read: Pub[]

Profile
    pubCount: Integer
    followModule: Address
    followNFT: String
    handle: String
    imageURI: String
    followNFTURI: String

Pub
    pubId: Integer
    contentURI: String
    profile: Profile!

FeedPub
    feed: Feed!
    author: Profile!
    pub: Pub!

Stream
    profile: Profile
    // authors: 
    owner: Address!
    name: String

User
    following: Profile[]
    inbox: Inbox
    profile: Profile
```

## Event handlers.

```
onFollow
    user.following = user.following.push(profile)

onUnfollow
    user.following = user.following.remove(profile)

onPostToFeedCreated
    // collect the author of this post
    Pub pub = Pub.find(event.pubId)
    FeedPub feedPub = FeedPub.create()
    feedPub
```