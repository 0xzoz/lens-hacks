import { useAccount, useConnect } from 'wagmi'

const WalletConnector = () => {
    const [{ data, error }, connect] = useConnect()

    return (
        <div>
            {data.connectors.map((connector) => (
                <button
                    disabled={!connector.ready}
                    key={connector.id}
                    onClick={() => connect(connector)}
                >
                    {connector.id}
                    {!connector.ready && ' (unsupported)'}
                </button>
            ))}

            {error && <div>{error?.message ?? 'Failed to connect'}</div>}
        </div>
    )
}

export default WalletConnector 

