# Entities

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