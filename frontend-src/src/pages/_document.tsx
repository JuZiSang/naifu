import Document, { DocumentContext, DocumentInitialProps, Html, Head, Main, NextScript } from 'next/document'
import { Fragment } from 'react'
import { ServerStyleSheet } from 'styled-components'

export default class CustomDocument extends Document {
    static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
        const sheet = new ServerStyleSheet()
        const originalRenderPage = ctx.renderPage

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
                })

            const initialProps = await Document.getInitialProps(ctx)
            return {
                ...initialProps,
                styles: [
                    <Fragment key="1">
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </Fragment>,
                ],
            }
        } finally {
            sheet.seal()
        }
    }

    render(): JSX.Element {
        return (
            <Html lang="en">
                <Head>
                    <link rel="preconnect" href="https://fonts.gstatic.com" />
                    <meta name="referrer" content="no-referrer" />

                    <link rel="icon" href="/icons/novelai-round.png" />
                    <link rel="apple-touch-icon" href="/icons/novelai-square.png" />
                    <link rel="mask-icon" href="/icons/pen-tip-light.svg" color="#ffffff" />
                    <link rel="manifest" href="/manifest.json" />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
