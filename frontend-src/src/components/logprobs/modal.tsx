import { useEffect, useRef } from 'react'
import { useRecoilCallback, useRecoilState } from 'recoil'

import { SessionValue, TokenProbOpen } from '../../globals/state'
import { HotEvent, HotEventSub, subscribeToHotEvent } from '../../data/user/hotkeys'
import { UserSettings } from '../../data/user/settings'
import Modal from '../modals/modal'
import LogProbsModalContent from './content'

export default function LogProbsModal(): JSX.Element {
    const [tokenProbVisible, setTokenProbVisible] = useRecoilState(TokenProbOpen)

    const hotTokenProbToggleRef = useRef<any>()
    const hotTokenProbCloseRef = useRef<any>()

    const hotTokenProbToggle = useRecoilCallback(({ snapshot }) => () => {
        snapshot.getPromise(SessionValue('settings')).then((settings) => {
            if ((settings as UserSettings).enableLogprobs) {
                setTokenProbVisible(!tokenProbVisible)
            }
        })
        return true
    })
    hotTokenProbToggleRef.current = hotTokenProbToggle

    const hotTokenProbClose = () => {
        setTokenProbVisible(false)
        return true
    }
    hotTokenProbCloseRef.current = hotTokenProbClose

    useEffect(() => {
        subscribeToHotEvent(HotEvent.tokenprob, new HotEventSub('tpT', hotTokenProbToggleRef))
        subscribeToHotEvent(HotEvent.closeModal, new HotEventSub('tpC', hotTokenProbCloseRef))
    }, [])

    return (
        <Modal
            label="Token Probabilities"
            isOpen={tokenProbVisible}
            shouldCloseOnOverlayClick={true}
            onRequestClose={() => setTokenProbVisible(false)}
        >
            <LogProbsModalContent />
        </Modal>
    )
}
