import Head from 'next/head'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import React from 'react'

class Home extends React.Component<IHomeProps, {}> {

    render() {
        return <div><h1>Hello Next.js</h1></div>;
    }
}

export default Home;