import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

import dynamic from 'next/dynamic'
import Inbox from '../components/Inbox'


// WORKAROUND: https://github.com/tmm/wagmi/issues/28
const WalletConnector = dynamic(() => import('../components/wallet/connector'), { ssr: false })
const WalletProfile = dynamic(() => import('../components/wallet/profile'), { ssr: false })


const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Annonce</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <WalletConnector/>
        <WalletProfile/>

        <Inbox/>
      </main>
    </div>
  )
}

export default Home
