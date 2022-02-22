


const InboxItem = ({ feedPub }: { feedPub: any }) => {
    
}

const Inbox = () => {
    // Fetch from subgraph.
    
    /*
    inbox(user: ${userAddress}) {
        items(orderBy: createdAt, orderDirection: desc) {
            feed {
                profile {
                    handle, 
                    imageURI
                }
            },
            author {
                handle,
                imageURI
            },
            pub {
                id,
                contentURI,
                content
            }
        }
    }
    */

    return <>
        <h2>Inbox</h2>
        {/* Show all items in a user's inbox */}
        
    </>
}

export default Inbox