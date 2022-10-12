/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { useState, useRef, MutableRefObject } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import { DebugSettings, SiteTheme } from '../../../globals/state'
import { OldNaiIcon, PenTipIcon } from '../../../styles/ui/icons'

const Confetti = styled(ReactCanvasConfetti)`
    position: absolute;
    max-width: unset;
    width: 100px;
    height: 150px;
    bottom: -25px;
    left: -35px;
    pointer-events: none;
`

export default function MenuBarLogo(): JSX.Element {
    const [clickState, setClickState] = useState(0)
    const confettiRef: MutableRefObject<any> = useRef(null)
    const siteTheme = useRecoilValue(SiteTheme)
    const setDebugSettings = useSetRecoilState(DebugSettings)
    const fire = () => {
        confettiRef.current.confetti({
            spread: 38,
            startVelocity: 14,
            origin: { y: 0.75 },
            particleCount: Math.floor(25),
            colors: [siteTheme.colors.textHeadings],
            scalar: 0.75,
        })
    }

    return (
        <div
            style={{ overflow: 'visible', position: 'relative', marginLeft: '-1px' }}
            onClick={() => {
                setClickState(clickState + 1)
                if (clickState === 15) fire()
                if (clickState === 20) {
                    toast('Debug settings enabled.')
                    setDebugSettings(true)
                }
            }}
        >
            {clickState > 15 ? <OldNaiIcon /> : <PenTipIcon />}
            <Confetti ref={confettiRef} />
        </div>
    )
}
