import styled from 'styled-components'
import { getContrast, lighten, darken, colorIsLight } from '../../util/colour'

export const Slider = styled.input.attrs((props) => ({
    className: `${props.className ?? ''} slider`,
}))`
    appearance: none;
    background: ${(props) => props.theme.colors.bg0};
    height: 10px;
    outline: none !important;
    padding: 0;
    width: 100%;
    border: 2px solid transparent;

    &::-webkit-slider-thumb {
        appearance: none;
        background: ${(props) =>
            getContrast(props.theme.colors.bg0, props.theme.colors.bg3) < 1.2
                ? colorIsLight(props.theme.colors.bg3)
                    ? darken(0.05, props.theme.colors.bg3)
                    : lighten(0.1, props.theme.colors.bg3)
                : props.theme.colors.bg3};

        cursor: pointer;
        height: 20px;
        width: 10px;
    }

    &::-moz-range-thumb {
        background: ${(props) =>
            getContrast(props.theme.colors.bg0, props.theme.colors.bg3) < 1.2
                ? colorIsLight(props.theme.colors.bg3)
                    ? darken(0.05, props.theme.colors.bg3)
                    : lighten(0.1, props.theme.colors.bg3)
                : props.theme.colors.bg3};

        cursor: pointer;
        height: 20px;
        width: 10px;
    }

    &:focus {
        &::-webkit-slider-thumb {
            border: 1px solid ${(props) => props.theme.colors.bg0};
        }

        &::-moz-range-thumb {
            border: 1px solid ${(props) => props.theme.colors.bg0};
        }
    }

    // Make slider only respond to thumb clicks when on mobile
    @media (max-width: 800px) {
        pointer-events: none;
        &::-webkit-slider-thumb {
            pointer-events: auto;
        }
        &::-moz-range-thumb {
            pointer-events: auto;
        }
    }
`

export const ThickSlider = styled.input.attrs((props) => ({
    className: `${props.className ?? ''} slider thick-slider`,
}))`
    appearance: none;
    background: ${(props) => props.theme.colors.bg0};
    height: 26px;
    outline: none !important;
    padding: 0;
    width: 100%;
    margin-bottom: 0.5rem;

    &::-webkit-slider-thumb {
        appearance: none;
        background: ${(props) =>
            getContrast(props.theme.colors.bg0, props.theme.colors.bg3) < 1.2
                ? colorIsLight(props.theme.colors.bg3)
                    ? darken(0.05, props.theme.colors.bg3)
                    : lighten(0.1, props.theme.colors.bg3)
                : props.theme.colors.bg3};

        cursor: pointer;
        height: 26px;
        width: 14px;
    }

    &::-moz-range-thumb {
        background: ${(props) =>
            getContrast(props.theme.colors.bg0, props.theme.colors.bg3) < 1.2
                ? colorIsLight(props.theme.colors.bg3)
                    ? darken(0.05, props.theme.colors.bg3)
                    : lighten(0.1, props.theme.colors.bg3)
                : props.theme.colors.bg3};

        cursor: pointer;
        height: 20px;
        width: 10px;
    }

    &:focus {
        &::-moz-range-thumb {
            background: ${(props) => props.theme.colors.textHeadings};
        }
        &::-webkit-slider-thumb {
            background: ${(props) => props.theme.colors.textHeadings};
        }
    }

    // Make slider only respond to thumb clicks when on mobile
    @media (max-width: 800px) {
        pointer-events: none;
        &::-webkit-slider-thumb {
            pointer-events: auto;
        }
        &::-moz-range-thumb {
            pointer-events: auto;
        }
    }
`

export const ThinSlider = styled.input.attrs((props) => ({
    className: `${props.className ?? ''} slider thin-slider`,
}))`
    appearance: none;
    background: ${(props) => props.theme.colors.bg0};
    height: 12px;
    outline: none !important;
    padding: 0;
    width: 100%;
    margin-bottom: 0.2rem;

    &::-webkit-slider-thumb {
        appearance: none;
        background: ${(props) =>
            getContrast(props.theme.colors.bg0, props.theme.colors.bg3) < 1.2
                ? colorIsLight(props.theme.colors.bg3)
                    ? darken(0.05, props.theme.colors.bg3)
                    : lighten(0.1, props.theme.colors.bg3)
                : props.theme.colors.bg3};

        cursor: pointer;
        height: 18px;
        width: 12px;
    }

    &::-moz-range-thumb {
        background: ${(props) =>
            getContrast(props.theme.colors.bg0, props.theme.colors.bg3) < 1.2
                ? colorIsLight(props.theme.colors.bg3)
                    ? darken(0.05, props.theme.colors.bg3)
                    : lighten(0.1, props.theme.colors.bg3)
                : props.theme.colors.bg3};

        cursor: pointer;
        height: 18px;
        width: 12px;
    }

    &:focus {
        &::-moz-range-thumb {
            background: ${(props) => props.theme.colors.textHeadings};
        }
        &::-webkit-slider-thumb {
            background: ${(props) => props.theme.colors.textHeadings};
        }
    }

    &[disabled] {
        opacity: 0.5;
    }

    // Make slider only respond to thumb clicks when on mobile
    @media (max-width: 800px) {
        pointer-events: none;
        &::-webkit-slider-thumb {
            pointer-events: auto;
        }
        &::-moz-range-thumb {
            pointer-events: auto;
        }
    }
`
