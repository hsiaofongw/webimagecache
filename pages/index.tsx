import Head from 'next/head'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import React from 'react'

class Home extends React.Component<IHomeProps, {}> {

    render() {
        return <div>
            <Head>
                <script src="/trackcode.js" />
            </Head>
            <h1>Hello Next.js</h1>
        </div>;
    }
}

export default Home;