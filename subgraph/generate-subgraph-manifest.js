


const { ethers } = require('ethers')
const { writeFileSync } = require('fs')
const { join, relative } = require('path')
const glob = require('glob')
const yaml = require('js-yaml');
const fs = require('fs');

const SPEC_VERSION = '0.0.4'
const API_VERSION = '0.0.6'

const generateManifest = ({ context, contracts }) => {
    const contractFilters = {
        dataSource: contract => contract.address,
        template: contract => !contract.address,
    }

    const renderContract = (source) => {
        const { name, address, abi, startBlock, entities } = source
        const isTemplate = !address

        return {
            "kind": "ethereum/contract",
            name,
            network: context.network,
            source: isTemplate
                ? { abi, }
                : {
                    address, abi, startBlock
                },
            mapping: {
                kind: "ethereum/events",
                apiVersion: API_VERSION,
                language: "wasm/assemblyscript",
                entities: entities,
                abis: context.abis,
                eventHandlers: source.eventHandlers.map(eventHandler => {
                    // {
                    //     "event": "NewCommunity(address)",
                    //     "handler": "handleNewCommunity"
                    // }
                    const handler = eventHandler.handler || `handle${eventHandler.event.split('(')[0]}`
                    return {
                        event: eventHandler.event,
                        handler
                    }
                }),
                file: "./src/mappings.ts"
            },
        }
    }

    return {
        specVersion: SPEC_VERSION,
        schema: {
            file: "./schema.graphql"
        },
        dataSources: contracts.filter(contractFilters.dataSource).map(renderContract),
        templates: contracts.filter(contractFilters.template).map(renderContract)
    }
}

/**
 * 
 */
function load(data) {
    const { network } = data
    const deployments = require(`../deployments/${network}.json`)

    const contracts = data.contracts.map((contract) => {
        const { name, entities } = contract

        const deployment = deployments.contracts[name]
        if(!deployment) throw new Error("Deployment not found for "+name)

        let abi = contract.abi
        let abiPath

        if (!contract.abi) {
            abi = deployment.abi
            // write that ABI to a file.
            abiPath = join(__dirname, '/abis/', `${contract.name}.json`);
            
            // Remove the Solidity Error type from ABI, as graph-node doesn't support it.
            // See: https://github.com/graphprotocol/graph-node/issues/2577
            abi = abi.filter(item => item.type !== 'error')

            writeFileSync(
                abiPath,
                JSON.stringify(abi, null, 1)
            )
        }

        if (!abi) {
            // Automatically guess the ABI.
            const matches = glob.sync(`../abi/**/${name}.json`)
            if(!matches.length) throw new Error("No ABI found for contract: "+name)
            if(matches.length > 1) throw new Error("More than one ABI found for contract: "+name)
            abiPath = matches[0]
            abi = require(abiPath)
        }

        const iface = new ethers.utils.Interface(abi)

        // Automatically generate event handler function signatures from event names.
        const eventHandlers = contract.eventHandlers.map(eventHandler => {
            if(eventHandler.event.includes('(')) {
                // not a partial event definition.
                return eventHandler
            }
            
            // partial lookup using ethers
            const eventFragment = iface.getEvent(eventHandler.event)
            // const eventFragment = iface.events[eventHandler.event]
            
            console.log(iface.events)

            if (!eventFragment) throw new Error("event not found - "+eventHandler.event)

            // const event = eventFragment.signature
            const event = eventFragment.format(ethers.utils.FormatTypes.minimal)
            console.log(event)

            const handler = `handle${eventFragment.name}`

            return {
                ...eventHandler,
                handler,
                event,
            }
        })
        
        // Figure out contract deployment info.
        // `contract.useAddressOf` allows us to use the address of another contract
        // as the address for this target. This is useful when we deploy the main
        // contract as XYZ, and we have a proxy sit in front of it, XYZProxy. 
        // We want to listen on XYZProxy, but use the XYZ contract's ABI.
        let address
        if (contract.useAddressOf) {
            const deployment2 = deployments.contracts[contract.useAddressOf]
            address = deployment2.address
        } else {
            address = deployment.address
        }

        if (contract.useStartBlockOf) {
            const deployment2 = deployments.contracts[contract.useStartBlockOf]
            startBlock = deployment2.deployTransaction.blockNumber
        } else {
            startBlock = deployment.deployTransaction.blockNumber
        }

        return {
            name,
            address,
            startBlock,
            entities,
            eventHandlers,
            abi: name,
            abiPath: './' + relative('.', abiPath)
        }
    })

    // {
    //     abis: [
    //         {
    //             "name": "Curatem",
    //             "file": "../curatem-contracts/abis/CuratemV1.json"
    //         }
    //     ],
    //     network: 'mainnet'
    // }

    return {
        contracts
    }

    // {
    //     name: 'SugarFeed',
    //         address: '0x',
    //             abi: '',
    //                 startBlock: '',
    //                     entities: ['SugarFeed'],
    //                         eventHandlers: [
    //                             {
    //                                 "event": // "Update(uint,uint)", load from ethers
    //                                 // "handler": "handleNewCommunity"
    //                             }
    //                         ]
    // }
    // ]
}

function formatContractAbi(contract) {
    return {
        // abi: contract.abi,
        name: contract.name,
        file: contract.abiPath
    }
} 

function generate({ subgraphNetwork, network, contracts }) {
    const { contracts: contractBlobs } = load({
        network,
        contracts
    })

    const context = {
        abis: contractBlobs.map(formatContractAbi),
        network: subgraphNetwork
    }

    const manifest = generateManifest({ contracts: contractBlobs, context })
    // console.log(
    //     JSON.stringify(manifest, null, 1))

    fs.writeFileSync(
        'subgraph.yaml',
        yaml.dump(manifest, { lineWidth: -1 })
    )
    return manifest
}


// 
// Configuration.
// 
function main() {
    const network = process.env.NETWORK
    if (!process.env.NETWORK) {
        throw new Error("NETWORK env var is not defined.")
    }
    const manifest = generate({
        subgraphNetwork: network,
        network,
        contracts: [
            {
                name: "LensHub",
                useAddressOf: 'LensHubProxy',
                useStartBlockOf: 'LensHubProxy',
                eventHandlers: [
                    {
                        event: "PostCreated(indexed uint256,indexed uint256,string,address,bytes,address,bytes,uint256)"
                    },
                    {
                        event: "ProfileCreated(indexed uint256,indexed address,indexed address,string,string,address,bytes,string,uint256)"
                    },
                ],
                entities: [
                    // Followed
                    ...`ProfileCreated
                    PostCreated
                    ProfileCreatorWhitelisted
                    FollowModuleWhitelisted
                    ReferenceModuleWhitelisted
                    CollectModuleWhitelisted
                    DispatcherSet
                    ProfileImageURISet
                    FollowNFTURISet
                    FollowModuleSet
                    MirrorCreated
                    CommentCreated`.split('\n').map(x => x.trim())
                ]
            },
            // {
            //     name: "Feed",
            //     eventHandlers: [],
            //     entities: [

            //     ]
            // }
        ]
    })

    if (process.env.DEBUG) {
        console.log(
            JSON.stringify(manifest, null, 1)
        )
    }
}





// module.exports = manifest

module.exports = main()


// type SubgraphEntrySource = {
//     abi: string
//     address: string?
//     startBlock: number?
// }

// type ABIItem = {
//     name: string
//     file: string
// }

// type EventHandler = {
//     event: string
//     handler: string
// }

// type SubgraphMapping = {
//     kind: string
//     apiVersion: string
//     language: string
//     entities: string[]
//     abis: ABIItem[]
//     eventHandlers: EventHandler[]
//     file: string
// }

// type SubgraphManifest = {
//     kind: string
//     name: string
//     network: string
//     source: SubgraphEntrySource
//     mapping: SubgraphMapping
// }


// JSON representation of a 0.0.4 Subgraph Manifest.
// Generated November 2021.

// {
//     "kind": "ethereum/contract",
//     "name": "Curatem",
//     "network": {
//         "[object Object]": null
//     },
//     "source": {
//         "address": "{{Curatem.address}}",
//         "abi": "Curatem",
//         "startBlock": {
//             "[object Object]": null
//         }
//     },
//     "mapping": {
//         "kind": "ethereum/events",
//         "apiVersion": "0.0.4",
//         "language": "wasm/assemblyscript",
//         "entities": [
//             "Community",
//             "Market"
//         ],
//         "abis": [
//             {
//                 "name": "Curatem",
//                 "file": "../curatem-contracts/abis/CuratemV1.json"
//             },
//             {
//                 "name": "CuratemCommunity",
//                 "file": "../curatem-contracts/abis/CuratemCommunity.json"
//             },
//             {
//                 "name": "SpamPredictionMarket",
//                 "file": "../curatem-contracts/abis/SpamPredictionMarket.json"
//             },
//             {
//                 "name": "ERC20",
//                 "file": "../curatem-contracts/abis/ERC20.json"
//             }
//         ],
//         "eventHandlers": [
//             {
//                 "event": "NewCommunity(address)",
//                 "handler": "handleNewCommunity"
//             }
//         ],
//         "file": "./src/curatem.ts"
//     }
// }
//     ],
//         "templates": [
//             {
//                 "kind": "ethereum/contract",
//                 "name": "CuratemCommunity",
//                 "network": {
//                     "[object Object]": null
//                 },
//                 "source": {
//                     "abi": "CuratemCommunity"
//                 },
//                 "mapping": {
//                     "kind": "ethereum/events",
//                     "apiVersion": "0.0.4",
//                     "language": "wasm/assemblyscript",
//                     "entities": [
//                         "Community",
//                         "Market"
//                     ],
//                     "abis": [
//                         {
//                             "name": "CuratemCommunity",
//                             "file": "../curatem-contracts/abis/CuratemCommunity.json"
//                         },
//                         {
//                             "name": "SpamPredictionMarket",
//                             "file": "../curatem-contracts/abis/SpamPredictionMarket.json"
//                         }
//                     ],
//                     "eventHandlers": [
//                         {
//                             "event": "NewSpamPredictionMarket(indexed bytes32,indexed bytes32,indexed address)",
//                             "handler": "handleNewSpamPM"
//                         }
//                     ],
//                     "file": "./src/community.ts"
//                 }
//             },
//             {
//                 "kind": "ethereum/contract",
//                 "name": "SpamPredictionMarket",
//                 "network": {
//                     "[object Object]": null
//                 },
//                 "source": {
//                     "abi": "SpamPredictionMarket"
//                 },
//                 "mapping": {
//                     "kind": "ethereum/events",
//                     "apiVersion": "0.0.4",
//                     "language": "wasm/assemblyscript",
//                     "entities": [
//                         "Community",
//                         "Market"
//                     ],
//                     "abis": [
//                         {
//                             "name": "SpamPredictionMarket",
//                             "file": "../curatem-contracts/abis/SpamPredictionMarket.json"
//                         }
//                     ],
//                     "eventHandlers": [
//                         {
//                             "event": "Initialized()",
//                             "handler": "handleInitialized"
//                         },
//                         {
//                             "event": "SharesBought(indexed address,uint256)",
//                             "handler": "handleSharesBought"
//                         },
//                         {
//                             "event": "SharesSold(indexed address,uint256)",
//                             "handler": "handleSharesSold"
//                         },
//                         {
//                             "event": "Finalized()",
//                             "handler": "handleFinalized"
//                         },
//                         {
//                             "event": "SharesRedeemed(indexed address,uint256)",
//                             "handler": "handleSharesRedeemed"
//                         }
//                     ],
//                     "file": "./src/spam_prediction_market.ts"
//                 }
//             }
//         ]
// }