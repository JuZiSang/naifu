import React, { useCallback, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { LastResponse, SiteTheme } from '../../globals/state'
import {
    IdToggleButton,
    LogprobsContainer,
    LogprobsTab,
    LogprobsTable,
    LogprobsTableItem,
    LogprobsTabs,
    LogprobsTableHeader,
    LogProbsRow,
    LogprobsTableNumberItem,
} from '../../styles/components/logprobs'
import { LogProbs } from '../../data/request/remoterequest'
import { FlexCol } from '../../styles/ui/layout'
import { TokenizerOutput } from '../tokenizer'
import { AaIcon } from '../../styles/ui/icons'
import { complement, darken, mix } from '../../util/colour'
import { checkNeed } from '../../tokenizer/util'
import { logprobToProb, logprobToPercent } from '../../util/util'

export default function LogProbsModalContent(): JSX.Element {
    const lastResponse = useRecoilValue(LastResponse)
    const siteTheme = useRecoilValue(SiteTheme)

    const colorFromLogprob = useCallback(
        (logprob: number) => {
            const colors = siteTheme.colors
            const low = colors.textLowProb ?? darken(0.3, complement(colors.warning))
            const mid = colors.textMidProb ?? colors.textMain
            const high = colors.textHighProb ?? colors.warning
            const p = logprobToProb(logprob)
            return p > 0.5 ? mix((p - 0.5) * 2, high ?? colors.warning, mid) : mix(p * 2, mid, low)
        },
        [siteTheme.colors]
    )
    const tokenColors = useMemo(() => {
        const colorArr: string[] = []
        for (const prob of lastResponse.logprobs ?? []) {
            colorArr.push(colorFromLogprob(prob.chosen.after ?? 0))
        }
        return colorArr
    }, [colorFromLogprob, lastResponse.logprobs])

    const [selectedTokenIndex, setSelectedTokenIndex] = useState(0)
    const [selectedTokenRepr, setSelectedTokenRepr] = useState('')
    const [selectedProbsTab, setSelectedProbsTab] = useState(0)
    const [showTokenIds, setShowTokenIds] = useState(false)

    const [probsTabs, probsContent] = useMemo(() => {
        setSelectedProbsTab(0)
        if (!lastResponse.logprobs || lastResponse.logprobs.length < lastResponse.tokens.length)
            return [[<></>], [<></>]]

        let i = selectedTokenIndex
        const currentProbs = [lastResponse.logprobs[i]]
        let need = checkNeed(
            currentProbs.map((p) => p?.chosen?.token ?? 0),
            lastResponse.tokenizer
        )
        while (!need.complete) {
            if (need.error) {
                currentProbs.pop()
                break
            } else {
                i++
                currentProbs.push(lastResponse.logprobs[i])
            }
            need = checkNeed(
                currentProbs.map((p) => p?.chosen?.token ?? 0),
                lastResponse.tokenizer
            )
        }

        const probsContents: JSX.Element[] = []
        const probsTabs: JSX.Element[] = []
        let chosenCarry = 0
        for (const [probI, prob] of currentProbs.entries()) {
            if (!prob?.chosen) return [[<></>], [<></>]]
            let totalBefore = 0
            let totalAfter = 0

            const combinedStates = [prob.chosen]
            for (const before of prob.befores) {
                if (!combinedStates.some((p) => p.token === before.token)) {
                    combinedStates.push(before)
                }
            }
            for (const after of prob.afters) {
                if (!combinedStates.some((p) => p.token === after.token)) {
                    combinedStates.push(after)
                }
            }
            combinedStates.sort((a, b) => (b.after ?? -100) - (a.after ?? -100))
            const chosenRepr = showTokenIds
                ? prob.chosen.token
                : i > 0
                ? '[' + prob.chosen.token + ']'
                : prob.chosen.str
            probsTabs.push(<span key={probI}>{chosenRepr}</span>)
            probsContents.push(
                <LogprobsTable key={probI}>
                    <LogprobsTableHeader>Token</LogprobsTableHeader>
                    <LogprobsTableHeader style={{ textAlign: 'right' }}>Before</LogprobsTableHeader>
                    <LogprobsTableHeader style={{ textAlign: 'right' }}>After</LogprobsTableHeader>
                    {combinedStates.map((b, i) => {
                        const selected = prob.chosen.token === b.token
                        const color = colorFromLogprob(b.after ?? -100)
                        const tokenRepr = showTokenIds
                            ? b.token
                            : !checkNeed([b.token], lastResponse.tokenizer).complete
                            ? '[' + b.token + ']'
                            : b.str
                        const beforeColor = colorFromLogprob(b.before + chosenCarry)
                        const beforeRepr = logprobToPercent(b.before + chosenCarry)
                        const afterColor =
                            b.after != null ? colorFromLogprob(b.after + chosenCarry) : colorFromLogprob(-100)
                        const afterRepr = b.after != null ? logprobToPercent(b.after + chosenCarry) : '-'
                        totalBefore += logprobToProb(b.before)
                        totalAfter += b.after != null ? logprobToProb(b.after + chosenCarry) : 0

                        return (
                            <React.Fragment key={'frag-' + i}>
                                <LogprobsTableItem selected={selected} col={color} key={i + 's'}>
                                    {tokenRepr}
                                </LogprobsTableItem>
                                <LogprobsTableNumberItem col={beforeColor} key={i + 'b'}>
                                    {!showTokenIds ? beforeRepr : b.before.toFixed(3)}
                                </LogprobsTableNumberItem>
                                <LogprobsTableNumberItem col={afterColor} key={i + 'a'}>
                                    {!showTokenIds ? afterRepr : b.after != null ? b.after.toFixed(3) : '-'}
                                </LogprobsTableNumberItem>
                                {i === combinedStates.length - 1 && (
                                    <>
                                        <LogprobsTableItem key={i + 'st'}>
                                            Total % Not Shown
                                        </LogprobsTableItem>
                                        <LogprobsTableNumberItem key={i + 'bt'}>
                                            {Math.abs(100 - totalBefore * 100).toFixed(1)}
                                        </LogprobsTableNumberItem>
                                        <LogprobsTableNumberItem key={i + 'at'}>
                                            {Math.abs(100 - totalAfter * 100).toFixed(1)}
                                        </LogprobsTableNumberItem>
                                    </>
                                )}
                            </React.Fragment>
                        )
                    })}
                </LogprobsTable>
            )
            chosenCarry += prob.chosen.after ?? 0
        }
        if (currentProbs.length > 1 && !showTokenIds) {
            const beforeProb = currentProbs.reduce(
                (s: number, p: LogProbs) => (p.chosen.before ? p.chosen.before + s : s),
                0
            )
            const beforeColor = colorFromLogprob(beforeProb)
            const beforeRepr = logprobToPercent(beforeProb)
            const afterProb = currentProbs.reduce(
                (s: number, p: LogProbs) => (p.chosen.after ? p.chosen.after + s : s),
                0
            )
            const afterColor = colorFromLogprob(afterProb)
            const afterRepr = logprobToPercent(afterProb)
            probsTabs.push(<span key={currentProbs.length}>{selectedTokenRepr}</span>)
            probsContents.push(
                <LogprobsTable key={currentProbs.length}>
                    <>
                        <LogprobsTableItem col={afterColor} selected={true} key={i + 'sc'}>
                            {selectedTokenRepr}
                        </LogprobsTableItem>
                        <LogprobsTableNumberItem col={beforeColor} key={i + 'bc'}>
                            {beforeRepr}
                        </LogprobsTableNumberItem>
                        <LogprobsTableNumberItem col={afterColor} key={i + 'ac'}>
                            {afterRepr}
                        </LogprobsTableNumberItem>
                    </>
                    <></>
                </LogprobsTable>
            )
        }

        return [probsTabs, probsContents]
    }, [
        colorFromLogprob,
        lastResponse.logprobs,
        lastResponse.tokenizer,
        lastResponse.tokens.length,
        selectedTokenIndex,
        selectedTokenRepr,
        showTokenIds,
    ])

    return (
        <FlexCol>
            <div>
                <div>
                    Click on the below tokens to select them, and the probabilities of the tokens that could
                    have been generated will show in the table.
                    <br />
                    The columns are:
                </div>
                <div>
                    <strong>Token</strong> - These are the top 10 alternative tokens that the AI had to
                    consider
                </div>
                <div>
                    <strong>Before</strong> - These are the % probabilities <em>before</em> generation
                    settings, biasing, banning, and <em>after</em> modules are applied
                </div>
                <div>
                    <strong>After</strong> - These are the % probabilities <em>after</em> generation settings,
                    biasing, banning, and modules are applied
                </div>
                <div>
                    Tokens are color coded based on their probability:{' '}
                    <LogprobsTableItem
                        col={
                            siteTheme.colors.textLowProb ?? darken(0.3, complement(siteTheme.colors.warning))
                        }
                    >
                        Low
                    </LogprobsTableItem>{' '}
                    <span style={{ opacity: 0.5 }}>-</span>{' '}
                    <LogprobsTableItem col={siteTheme.colors.textMidProb ?? siteTheme.colors.textMain}>
                        Medium
                    </LogprobsTableItem>{' '}
                    <span style={{ opacity: 0.5 }}>-</span>{' '}
                    <LogprobsTableItem col={siteTheme.colors.textHighProb ?? siteTheme.colors.warning}>
                        High
                    </LogprobsTableItem>{' '}
                </div>
            </div>
            <LogProbsRow>
                <div style={{ flex: '1 1 auto' }}>
                    <TokenizerOutput
                        encoderType={lastResponse.tokenizer}
                        tokenizerText={lastResponse.tokens}
                        selectedToken={selectedTokenIndex}
                        onTokenClick={(i, token, repr) => {
                            setSelectedTokenIndex(i)
                            setSelectedTokenRepr(repr)
                        }}
                        colors={tokenColors}
                    />
                </div>
                <div></div>
                {lastResponse.logprobs && lastResponse.logprobs.length > 0 && (
                    <LogprobsContainer>
                        <LogprobsTabs>
                            {probsTabs.length > 1 &&
                                probsTabs.map((e, i) => (
                                    <LogprobsTab
                                        onClick={() => setSelectedProbsTab(i)}
                                        selected={selectedProbsTab === i}
                                        key={i}
                                    >
                                        {e}
                                    </LogprobsTab>
                                ))}
                            <IdToggleButton
                                selected={!showTokenIds}
                                onClick={() => setShowTokenIds((v) => !v)}
                            >
                                <AaIcon />
                            </IdToggleButton>
                        </LogprobsTabs>
                        {probsContent[selectedProbsTab]}
                    </LogprobsContainer>
                )}
            </LogProbsRow>
        </FlexCol>
    )
}
