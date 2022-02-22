set -ex
. ./.env

npx graph deploy liamzebedee/annonce --ipfs $IPFS_URL --node $GRAPH_NODE_URL --access-token $THEGRAPH_TOKEN