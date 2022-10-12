import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { BackendURL } from '../globals/constants'
import { logError } from '../util/browser'
import { fetchWithTimeout } from '../util/general'

const Warning = styled.div<{ visible: boolean }>`
    position: absolute;
    z-index: 2001;
    left: 0;
    right: 0;
    height: auto;
    background: rgba(0, 0, 0, 0.5);
    display: ${(props) => (props.visible ? 'flex' : 'none')};
    color: white;
    pointer-events: none;
`

export default function OnlineCheck(): JSX.Element {
    const [online, setOnline] = useState(true)

    useEffect(() => {
        const check = setInterval(() => {
            fetchWithTimeout(BackendURL, {
                cache: 'no-store',
            })
                .then((status) => {
                    if (status.ok) {
                        setOnline(true)
                    } else {
                        setOnline(false)
                    }
                })
                .catch((error) => {
                    logError(error, false, 'online check unsuccessful')
                    setOnline(false)
                })
        }, 12000)

        return () => {
            clearInterval(check)
        }
    }, [])

    return (
        <Warning visible={!online}>
            There are issues connecting to the backend right now, please check your connection or try again...
        </Warning>
    )
}
