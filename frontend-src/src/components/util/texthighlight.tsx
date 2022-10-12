import styled from 'styled-components'
import { MatchBit } from '../../data/storage/search'

const HighlightContainer = styled.span``
const Highlight = styled.span`
    background: ${(props) => props.theme.colors.textHighlight};
`

export function TextHighlight(props: { text: string; highlight?: MatchBit[] }): JSX.Element {
    let text

    if (props.highlight && props.highlight.length > 0) {
        const blocks = []
        if (props.highlight[0].start > 0) {
            blocks.push(props.text.slice(0, props.highlight[0].start))
        }

        for (const match of props.highlight) {
            blocks.push(<Highlight key={blocks.length}>{props.text.slice(match.start, match.end)}</Highlight>)
            if (match.end !== match.next) {
                blocks.push(props.text.slice(match.end, match.next))
            }
        }

        text = <HighlightContainer>{blocks.map((block) => block)}</HighlightContainer>
    } else {
        text = <HighlightContainer>{props.text}</HighlightContainer>
    }

    return text
}
