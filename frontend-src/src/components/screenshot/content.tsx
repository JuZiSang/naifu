/* eslint-disable max-len */
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { toJpeg, toPng } from 'html-to-image'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { mix, rgba } from 'polished'
import { Fragment, DataOrigin } from '../../data/story/story'
import { GlobalUserContext } from '../../globals/globals'
import { ScreenshotModalState, SelectedStoryId, Session, SiteTheme } from '../../globals/state'
import { useWindowSize } from '../../hooks/useWindowSize'
import { Dark } from '../../styles/themes/dark'
import { Light } from '../../styles/themes/light'
import { LightColorButton, SubtleButton } from '../../styles/ui/button'
import { FlexCol, FlexColSpacer, FlexRow } from '../../styles/ui/layout'
import { AltCheckbox } from '../controls/checkbox'
import Radio from '../controls/radio'
import { MinorSettingSliderCard } from '../sidebars/common/editorcard'
import useRememberedValue from '../../hooks/useRememberedValue'
import { getAvailiableModels, ModelData } from '../../util/models'
import { DefaultModel, normalizeModel } from '../../data/request/model'
import Sidebar from '../sidebars/common/sidebar'
import { ArrowLeftIcon, ArrowRightIcon } from '../../styles/ui/icons'
import { AlternateCheckboxContainer } from '../../styles/ui/checkbox'
import { CloseButton } from '../modals/common'
import { googleFonts } from '../../styles/themes/theme'
import { logWarning } from '../../util/browser'
import { getUserSetting } from '../../data/user/settings'

const ScreenshotModalContainer = styled.div`
    background-color: ${(props) => props.theme.colors.bg2};
    font-size: 1rem;
    min-width: min(100vw, 800px);
    overflow-y: auto;
    height: 100%;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    box-sizing: border-box;
    border-radius: 3px;
    @media (max-width: 800px) {
        height: var(--app-height, 100%);
    }

    ${AlternateCheckboxContainer} {
        border-radius: 3px;
    }

    ${LightColorButton} {
        border-radius: 3px;
        padding: 12px 30px;
    }
`

interface htmlToImageOptions {
    skipAutoScale: boolean
    pixelRatio: number
    quality: number
}

const backgroundSVG = `<svg width="1571" height="1115" viewBox="0 0 1571 1115" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M1470.63 401.108C1505.93 401.108 1534.56 429.729 1534.56 465.034C1534.56 500.34 1505.93 528.961 1470.63 528.961C1435.32 528.961 1406.7 500.34 1406.7 465.034C1406.7 429.729 1435.32 401.108 1470.63 401.108ZM1470.63 402.108C1505.38 402.108 1533.56 430.281 1533.56 465.034C1533.56 499.788 1505.38 527.961 1470.63 527.961C1435.88 527.961 1407.7 499.788 1407.7 465.034C1407.7 430.281 1435.88 402.108 1470.63 402.108Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M1570.43 465.034C1570.43 409.914 1525.75 365.229 1470.63 365.229C1415.51 365.229 1370.82 409.914 1370.82 465.034C1370.82 520.155 1415.51 564.839 1470.63 564.839C1525.75 564.839 1570.43 520.155 1570.43 465.034ZM1569.43 465.034C1569.43 410.466 1525.2 366.229 1470.63 366.229C1416.06 366.229 1371.82 410.466 1371.82 465.034C1371.82 519.603 1416.06 563.839 1470.63 563.839C1525.2 563.839 1569.43 519.603 1569.43 465.034Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M1134.62 567.971C1155.3 567.971 1172.07 584.736 1172.07 605.416C1172.07 626.096 1155.3 642.861 1134.62 642.861C1113.94 642.861 1097.18 626.096 1097.18 605.416C1097.18 584.736 1113.94 567.971 1134.62 567.971ZM1134.62 568.971C1154.75 568.971 1171.07 585.288 1171.07 605.416C1171.07 625.544 1154.75 641.861 1134.62 641.861C1114.5 641.861 1098.18 625.544 1098.18 605.416C1098.18 585.288 1114.5 568.971 1134.62 568.971Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M1434.04 700.096C1473.83 700.096 1506.08 732.35 1506.08 772.137C1506.08 811.925 1473.83 844.179 1434.04 844.179C1411.39 844.179 1391.18 833.725 1377.97 817.377L1239.28 954.43C1250.59 970.846 1257.21 990.741 1257.21 1012.18C1257.21 1068.48 1211.57 1114.12 1155.27 1114.12C1098.97 1114.12 1053.33 1068.48 1053.33 1012.18C1053.33 994.425 1057.87 977.729 1065.85 963.191L724.128 678.172C713.666 690.054 698.341 697.551 681.265 697.551C649.733 697.551 624.172 671.989 624.172 640.458C624.172 608.927 649.733 583.366 681.265 583.366C712.796 583.366 738.357 608.927 738.357 640.458C738.357 654.554 733.249 667.456 724.783 677.415L1066.34 962.301C1083.81 931.231 1117.09 910.241 1155.27 910.241C1189.76 910.241 1220.26 927.375 1238.7 953.597L1377.34 816.591C1367.73 804.347 1362 788.912 1362 772.137C1362 753.053 1369.42 735.702 1381.53 722.812L1184.34 627.843C1175.79 646.773 1156.75 659.946 1134.62 659.946C1104.51 659.946 1080.09 635.532 1080.09 605.416C1080.09 575.425 1104.31 551.089 1134.25 550.888L1138.39 401.1C1125.01 400.758 1114.26 389.801 1114.26 376.335C1114.26 362.653 1125.36 351.561 1139.04 351.561C1152.72 351.561 1163.81 362.653 1163.81 376.335C1163.81 389.898 1152.91 400.915 1139.39 401.105L1135.25 550.89C1165.08 551.226 1189.15 575.509 1189.15 605.416C1189.15 613.055 1187.58 620.327 1184.75 626.927L1382.15 721.998L1381.98 722.334C1395.1 708.63 1413.57 700.096 1434.04 700.096ZM1434.04 701.096C1473.27 701.096 1505.08 732.902 1505.08 772.137C1505.08 811.373 1473.27 843.179 1434.04 843.179C1394.8 843.179 1363 811.373 1363 772.137C1363 732.902 1394.8 701.096 1434.04 701.096ZM1134.22 551.888L1134.12 555.429L1135.12 555.456L1135.22 551.89C1164.51 552.211 1188.15 576.052 1188.15 605.416C1188.15 634.98 1164.19 658.946 1134.62 658.946C1105.06 658.946 1081.09 634.98 1081.09 605.416C1081.09 575.987 1104.84 552.104 1134.22 551.888ZM681.265 673.347C690.872 673.347 699.517 669.228 705.53 662.659L723.36 677.531C713.081 689.193 698.032 696.551 681.265 696.551C650.286 696.551 625.172 671.437 625.172 640.458C625.172 609.479 650.286 584.366 681.265 584.366C712.244 584.366 737.357 609.479 737.357 640.458C737.357 654.31 732.336 666.989 724.015 676.775L706.194 661.911C711.155 656.152 714.153 648.655 714.153 640.458C714.153 622.294 699.429 607.57 681.265 607.57C663.101 607.57 648.376 622.294 648.376 640.458C648.376 658.622 663.101 673.347 681.265 673.347ZM1066.63 963.844L1066.68 963.884L1067.32 963.116L1067.12 962.953C1084.39 932.098 1117.4 911.241 1155.27 911.241C1211.02 911.241 1256.21 956.434 1256.21 1012.18C1256.21 1067.93 1211.02 1113.12 1155.27 1113.12C1099.52 1113.12 1054.33 1067.93 1054.33 1012.18C1054.33 994.67 1058.79 978.199 1066.63 963.844ZM681.265 608.57C663.653 608.57 649.376 622.847 649.376 640.458C649.376 658.07 663.653 672.347 681.265 672.347C698.876 672.347 713.153 658.07 713.153 640.458C713.153 622.847 698.876 608.57 681.265 608.57ZM1162.81 376.335C1162.81 363.205 1152.17 352.561 1139.04 352.561C1125.91 352.561 1115.26 363.205 1115.26 376.335C1115.26 389.464 1125.91 400.108 1139.04 400.108C1152.17 400.108 1162.81 389.464 1162.81 376.335Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M518.831 398.366C498.151 398.366 481.387 415.13 481.387 435.81C481.387 456.49 498.151 473.255 518.831 473.255C539.511 473.255 556.276 456.49 556.276 435.81C556.276 415.13 539.511 398.366 518.831 398.366ZM518.831 399.366C498.704 399.366 482.387 415.682 482.387 435.81C482.387 455.938 498.704 472.255 518.831 472.255C538.959 472.255 555.276 455.938 555.276 435.81C555.276 415.682 538.959 399.366 518.831 399.366Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M835.204 367.994C827.828 382.099 823.656 398.145 823.656 415.166C823.656 471.466 869.297 517.106 925.597 517.106C981.897 517.106 1027.54 471.466 1027.54 415.166C1027.54 358.866 981.897 313.225 925.597 313.225C886.733 313.225 852.949 334.973 835.75 366.963L730.719 192.523C747.109 179.318 757.594 159.081 757.594 136.395C757.594 96.6078 725.34 64.3536 685.553 64.3536C645.765 64.3536 613.511 96.6078 613.511 136.395C613.511 156.861 622.045 175.334 635.749 188.449L635.413 188.288L540.343 385.688C533.743 382.851 526.47 381.28 518.831 381.28C489.002 381.28 464.767 405.232 464.308 434.951L314.521 431.04C314.33 417.523 303.313 406.623 289.75 406.623C276.068 406.623 264.977 417.715 264.977 431.396C264.977 445.078 276.068 456.17 289.75 456.17C303.216 456.17 314.173 445.425 314.515 432.041L464.302 435.952C464.378 466.002 488.763 490.34 518.831 490.34C548.947 490.34 573.361 465.926 573.361 435.81C573.361 413.688 560.188 394.643 541.258 386.091L636.227 188.903C649.117 201.016 666.468 208.437 685.553 208.437C702.292 208.437 717.698 202.728 729.93 193.151L835.204 367.994ZM925.597 314.225C869.849 314.225 824.656 359.418 824.656 415.166C824.656 470.914 869.849 516.106 925.597 516.106C981.345 516.106 1026.54 470.914 1026.54 415.166C1026.54 359.418 981.345 314.225 925.597 314.225ZM685.553 65.3536C646.317 65.3536 614.511 97.1601 614.511 136.395C614.511 175.631 646.317 207.437 685.553 207.437C724.788 207.437 756.594 175.631 756.594 136.395C756.594 97.1601 724.788 65.3536 685.553 65.3536ZM465.302 435.81C465.302 406.247 489.268 382.28 518.831 382.28C548.395 382.28 572.361 406.247 572.361 435.81C572.361 465.374 548.395 489.34 518.831 489.34C489.268 489.34 465.302 465.374 465.302 435.81ZM265.977 431.396C265.977 418.267 276.62 407.623 289.75 407.623C302.88 407.623 313.523 418.267 313.523 431.396C313.523 444.526 302.88 455.17 289.75 455.17C276.62 455.17 265.977 444.526 265.977 431.396Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M458.693 923.682C458.719 922.676 458.732 921.666 458.732 920.652C458.732 891.077 447.332 864.164 428.685 844.069L633.037 671.736L632.392 670.971L428.001 843.338C407.469 821.599 378.376 808.034 346.114 808.034C283.916 808.034 233.495 858.455 233.495 920.652C233.495 982.85 283.916 1033.27 346.114 1033.27C406.962 1033.27 456.54 985.013 458.662 924.682H521.953L521.951 924.834L521.949 925.032L521.948 925.217C521.947 925.309 521.947 925.401 521.947 925.493C521.947 954.036 545.086 977.175 573.629 977.175C602.173 977.175 625.312 954.036 625.312 925.493C625.312 896.95 602.173 873.811 573.629 873.811C545.692 873.811 522.932 895.978 521.978 923.682H458.693ZM346.114 809.034C284.468 809.034 234.495 859.007 234.495 920.652C234.495 982.298 284.468 1032.27 346.114 1032.27C406.41 1032.27 455.54 984.461 457.661 924.682H457.309V923.682H457.692C457.719 922.676 457.732 921.666 457.732 920.652C457.732 859.007 407.759 809.034 346.114 809.034ZM573.629 874.811C545.638 874.811 522.947 897.502 522.947 925.493C522.947 953.484 545.638 976.175 573.629 976.175C601.62 976.175 624.312 953.484 624.312 925.493C624.312 897.502 601.62 874.811 573.629 874.811Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M112.619 607.854C90.6805 607.854 72.8961 625.639 72.8961 647.577C72.8961 669.515 90.6805 687.3 112.619 687.3C134.557 687.3 152.341 669.515 152.341 647.577C152.341 625.639 134.557 607.854 112.619 607.854ZM112.619 608.854C91.2329 608.854 73.8961 626.191 73.8961 647.577C73.8961 668.963 91.2329 686.3 112.619 686.3C134.005 686.3 151.341 668.963 151.341 647.577C151.341 626.191 134.005 608.854 112.619 608.854Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M0 647.577C2.71874e-06 585.379 50.4212 534.958 112.619 534.958C174.816 534.958 225.237 585.379 225.237 647.577C225.237 709.775 174.816 760.196 112.619 760.196C50.4211 760.196 -2.71874e-06 709.775 0 647.577ZM1 647.577C1 585.932 50.9734 535.958 112.619 535.958C174.264 535.958 224.237 585.932 224.237 647.577C224.237 709.222 174.264 759.196 112.619 759.196C50.9734 759.196 0.999997 709.222 1 647.577Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M314.523 99.805C314.523 64.4994 343.144 35.8786 378.449 35.8786C413.755 35.8786 442.376 64.4994 442.376 99.805C442.376 135.111 413.755 163.731 378.449 163.731C343.144 163.731 314.523 135.111 314.523 99.805ZM315.523 99.805C315.523 65.0517 343.696 36.8786 378.449 36.8786C413.203 36.8786 441.376 65.0517 441.376 99.805C441.376 134.558 413.203 162.731 378.449 162.731C343.696 162.731 315.523 134.558 315.523 99.805Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M278.644 99.805C278.644 44.6842 323.329 -6.57307e-07 378.449 0C433.57 -7.63047e-07 478.254 44.6842 478.254 99.805C478.254 154.926 433.57 199.61 378.449 199.61C323.329 199.61 278.644 154.926 278.644 99.805ZM279.644 99.805C279.644 45.2365 323.881 0.999999 378.449 1C433.018 1 477.254 45.2365 477.254 99.805C477.254 154.373 433.018 198.61 378.449 198.61C323.881 198.61 279.644 154.373 279.644 99.805Z" fill="#22253F"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M458.305 611.271C448.634 611.271 440.793 619.112 440.793 628.783C440.793 638.455 448.634 646.296 458.305 646.296C467.977 646.296 475.818 638.455 475.818 628.783C475.818 619.112 467.977 611.271 458.305 611.271ZM458.305 612.271C449.186 612.271 441.793 619.664 441.793 628.783C441.793 637.903 449.186 645.296 458.305 645.296C467.425 645.296 474.818 637.903 474.818 628.783C474.818 619.664 467.425 612.271 458.305 612.271Z" fill="#22253F"/>
</svg>`
const replaceBackgroundColor = (color: string) => {
    return backgroundSVG.replace(/fill="#22253F"/g, `fill="${color}"`)
}
const ScreenshotContainer = styled(motion.div)<{
    paragraphIndent: number
    paragraphSpacing: number
    lineSpacing: number
    fontSize: number
    background: boolean
}>`
    ${(props) =>
        props.background &&
        `background-image: url('data:image/svg+xml;utf8,${replaceBackgroundColor(
            rgba(mix(0.4, props.theme.colors.textMain, props.theme.colors.bg3), 0.2)
        )}');`};
    background-color: ${(props) => props.theme.colors.bg1};
    background-repeat: no-repeat;
    background-position: -80px -240px;
    color: ${(props) => props.theme.colors.textMain};
    padding: 30px 50px 30px 40px;
    font-size: ${(props) => props.fontSize}px;
    font-family: ${(props) => props.theme.fonts.default};
    font-weight: 600;
    overflow: hidden;
    p {
        padding-bottom: ${(props) => props.paragraphSpacing}em;
        text-indent: ${(props) => props.paragraphIndent}px;
        line-height: ${(props) => props.lineSpacing}em;
        margin: 0;
        font-size: 1.125em;
    }
    p:last-child {
        padding-bottom: 0;
    }
    > * {
        position: relative;
    }
`

const DragContainer = styled.div`
    height: 500px;
    position: relative;
    display: flex;
    overflow-y: scroll;
    overflow-x: auto;
    padding: 40px 25px 40px 35px;
    background-color: ${(props) => props.theme.colors.bg0};
    min-width: min(900px, calc(100vw - 350px));
    border: 1px solid ${(props) => props.theme.colors.bg3};
    box-sizing: border-box;
    border-radius: 3px;
    @media (max-width: 800px) {
        padding: 20px 10px 20px 20px;
        min-width: calc(100vw - 20px);
    }
    max-width: 20px;
`

const TextFragment = styled.span<{ type: DataOrigin }>`
    color: ${(props) => {
        switch (props.type) {
            case DataOrigin.user:
                return props.theme.colors.textUser
            case DataOrigin.ai:
                return props.theme.colors.textAI
            case DataOrigin.edit:
                return props.theme.colors.textEdit
            case DataOrigin.prompt:
                return props.theme.colors.textPrompt
            default:
                return props.theme.colors.textMain
        }
    }};
`

const ModalTitle = styled(FlexRow)`
    font-weight: 700;
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.125rem;
    padding: 28px 30px 15px 30px;
    border-bottom: 1px solid ${(props) => props.theme.colors.bg3};
    box-sizing: border-box;
    align-items: center;
    @media (max-width: 800px) {
        padding-top: 20px;
    }
`

const Settings = styled(FlexCol)`
    background-color: ${(props) => props.theme.colors.bg2};
    padding: 20px 20px 20px 30px;
    > * {
        margin-bottom: 10px;
    }
    border-right: 1px solid ${(props) => props.theme.colors.bg3};
    box-sizing: border-box;
    height: 100%;
    justify-content: flex-start;
    @media (max-width: 800px) {
        height: var(--app-height, 100%);
    }
    overflow-y: auto;
`

const PreviewPane = styled(FlexCol)`
    padding: 20px 30px 40px 10px;
    @media (max-width: 800px) {
        padding: 20px 10px 40px 10px;
    }
`

const ExcerptFrom = styled.div`
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.7;
`

const ModelImage = styled.img`
    height: 3.75em;
    width: 3.75em;
    margin: 0 20px;
    border: 1px solid ${(props) => props.theme.colors.bg3};
    border-radius: 3px;
`

const Title = styled.div`
    color: ${(props) => props.theme.colors.textHeadings};
    font-family: ${(props) => props.theme.fonts.headings};
    font-size: 1.5em;
    line-height: 1.5em;
    font-weight: bold;
`

const DateText = styled.span`
    color: ${(props) => props.theme.colors.textMain};
    font-weight: 600;
    opacity: 0.5;
    position: relative;
`

const PenName = styled.span`
    color: ${(props) => props.theme.colors.textMain};
    font-weight: 600;
    position: relative;
    padding-right: 2ch;
    opacity: 0.7;
`

const WrittenAlongside = styled.span`
    opacity: 0.7;
    flex: 1 1 auto;
    white-space: nowrap;
`

const Model = styled.span`
    font-family: ${(props) => props.theme.fonts.headings};
    font-weight: 700;
    flex: 1 1 auto;
    white-space: nowrap;
`

const DragHandle = styled.div<{ dragging: boolean }>`
    position: relative;
    height: calc(100%);
    width: calc(100%);
    transition: background-color 0.1s ease-in-out;
    background-color: ${(props) => props.theme.colors.bg3};
    opacity: 0.3;
    &:hover {
        background-color: ${(props) => props.theme.colors.bg3};
        opacity: 0.7;
    }
    ${(props) => {
        if (props.dragging) {
            return `
                    opacity: 0.7;
                    background-color: ${props.theme.colors.bg3};
                `
        }
    }}
`

const splitFragmentsOnNewline = (fragments: Fragment[]): Fragment[][] => {
    const newFragments: Fragment[][] = []
    // Split fragments into arrays of fragments based on newlines
    let runningFragments: Fragment[] = []
    for (const fragment of fragments) {
        if (fragment.data.includes('\n')) {
            const splitFragments = fragment.data.split('\n')
            for (const [i, split] of splitFragments.entries()) {
                runningFragments.push({ ...fragment, data: split })
                if (i < splitFragments.length - 1) {
                    newFragments.push(runningFragments)
                    runningFragments = []
                }
            }
        } else {
            runningFragments.push(fragment)
        }
    }
    if (runningFragments.length > 0) {
        newFragments.push(runningFragments)
    }

    return newFragments
}

export default function ScreenshotModalContent(): JSX.Element {
    const session = useRecoilValue(Session)
    const customTheme = useRecoilValue(SiteTheme)
    const [screenshotState, setScreenshotState] = useRecoilState(ScreenshotModalState)
    const selectedStory = useRecoilValue(SelectedStoryId)
    const currentStory = GlobalUserContext.stories.get(selectedStory)
    const currentStoryContent = GlobalUserContext.storyContentCache.get(selectedStory)
    const DRAG_HANDLE_WIDTH = 20
    const windowSize = useWindowSize()
    const [colors, setColors] = useState<{ [key: string]: string }>({})
    const x = useMotionValue(Math.min(700))
    const width = useTransform(x, (x) => `${x + DRAG_HANDLE_WIDTH}px`)

    const [dragging, setDragging] = useState(false)

    // Settings
    const [showTitle, setShowTitle] = useRememberedValue('screenshot-title', true)
    const [showPenName, setShowPenName] = useRememberedValue('screenshot-name', true)
    const [showNovelAI, setShowNovelAI] = useRememberedValue('screenshot-logo', true)
    const [showDate, setShowDate] = useRememberedValue('screenshot-date', true)
    const [fontSize, setFontSize] = useState(getUserSetting(session.settings, 'fontScale'))
    const [showColors, setShowColors] = useRememberedValue('screenshot-colors', false)
    const [showModel, setShowModel] = useRememberedValue('screenshot-model', true)
    const [themeChoice, setThemeChoice] = useState('custom')
    const [showBackground, setShowBackground] = useRememberedValue('screenshot-background', true)
    const [settingsVisible, setSettingsVisible] = useState(true)
    const [showColorLegend, setShowColorLegend] = useRememberedValue('screenshot-color-legend', false)

    const activeTheme = themeChoice === 'custom' ? customTheme : themeChoice === 'dark' ? Dark : Light
    const loadFonts = async () => {
        try {
            if (googleFonts.includes(activeTheme.fonts.selectedDefault))
                await loadFont(
                    `https://fonts.googleapis.com/css?family=${activeTheme.fonts.selectedDefault}:400,600,700`
                )
        } catch {
            logWarning('Failed to download paragraph font for sceenshot')
        }
        try {
            if (googleFonts.includes(activeTheme.fonts.selectedHeadings))
                await loadFont(
                    `https://fonts.googleapis.com/css?family=${activeTheme.fonts.selectedHeadings}:400,600,700`
                )
        } catch {
            logWarning('Failed to download header font for sceenshot')
        }
    }

    const selectedFragments = useMemo(() => {
        // TODO: Update for new document structure
        const fragments = currentStoryContent?.story?.fragments ?? []
        let characters = 0
        let startFragment = 0
        let endFragment = 0
        let startOffset = 0
        let endOffset = 0
        for (const [i, f] of fragments.entries()) {
            const fChars = f.data.length
            characters += fChars
            if (!startFragment && characters >= screenshotState.start) {
                startFragment = i
                startOffset = screenshotState.start - (characters - f.data.length)
            }
            if (!endFragment && characters >= screenshotState.end) {
                endFragment = i
                endOffset = screenshotState.end - (characters - f.data.length)
                break
            }
        }
        let newFragments = []
        newFragments =
            startFragment === endFragment
                ? [
                      {
                          ...fragments[startFragment],
                          data: fragments[startFragment]?.data.slice(startOffset, endOffset) ?? '',
                      },
                  ]
                : [
                      {
                          ...fragments[startFragment],
                          data: fragments[startFragment]?.data.slice(startOffset) ?? '',
                      },
                      ...fragments.slice(startFragment + 1, endFragment),
                      {
                          ...fragments[endFragment],
                          data: fragments[endFragment]?.data.slice(0, endOffset) ?? '',
                      },
                  ]
        return splitFragmentsOnNewline(newFragments)
    }, [currentStoryContent?.story?.fragments, screenshotState.end, screenshotState.start])

    useEffect(() => {
        const tempColors: { [key: string]: string } = {}
        for (const fragments of selectedFragments) {
            for (const fragment of fragments) {
                if (fragment.data.trim().length > 0)
                    switch (fragment.origin) {
                        case DataOrigin.user:
                            tempColors['User'] = activeTheme.colors.textUser
                            break
                        case DataOrigin.ai:
                            tempColors['AI'] = activeTheme.colors.textAI
                            break
                        case DataOrigin.edit:
                            tempColors['Edit'] = activeTheme.colors.textEdit
                            break
                        case DataOrigin.prompt:
                            tempColors['Prompt'] = activeTheme.colors.textPrompt
                            break
                        default:
                            tempColors['Unknown'] = activeTheme.colors.textMain
                            break
                    }
            }
        }
        const sortedColors = Object.entries(tempColors).sort((a, b) => {
            // eslint-disable-next-line unicorn/consistent-function-scoping
            const numVal = (v: string) => {
                switch (v) {
                    case 'Prompt':
                        return 1
                    case 'AI':
                        return 2
                    case 'User':
                        return 3
                    case 'Edit':
                        return 4
                    default:
                        return 5
                }
            }
            return numVal(a[0]) - numVal(b[0])
        })
        setColors(
            sortedColors.reduce<{ [key: string]: string }>((acc, [k, v]) => {
                acc[k] = v
                return acc
            }, {})
        )
    }, [
        activeTheme.colors.textAI,
        activeTheme.colors.textEdit,
        activeTheme.colors.textMain,
        activeTheme.colors.textPrompt,
        activeTheme.colors.textUser,
        selectedFragments,
    ])

    const [preparingImage, setPreparingImage] = useState(false)
    const selectedModel: ModelData =
        getAvailiableModels(true).find(
            (m) => m.str === normalizeModel(currentStoryContent?.settings.model ?? DefaultModel)
        ) ?? getAvailiableModels(true)[0]

    const modelRef = useRef<HTMLDivElement>(null)
    const settingsRef = useRef<HTMLDivElement>(null)
    const [lowerModel, setLowerModel] = useState(false)
    const setModelLocation = useCallback(() => {
        if (modelRef.current)
            if (x.get() * 0.5 < modelRef.current?.clientWidth) {
                setLowerModel(true)
            } else {
                setLowerModel(false)
            }
    }, [x])

    const previewMaxWidth = (() => {
        let breakpoint = windowSize.width
        if (windowSize.width > 800) breakpoint -= settingsRef.current?.clientWidth ?? 0
        breakpoint -= 40 // preview pane padding
        breakpoint -= 80 // drag container padding
        breakpoint -= 80 // don't know where the extra padding is coming from
        if (windowSize.width <= 800) {
            breakpoint += 90 // padding is reduced on mobile
        }
        return breakpoint
    })()

    const [widthInput, setWidthInput] = useState(x.get())
    const [widthBound, setWidthBound] = useState(false)

    useEffect(() => {
        if (widthBound && windowSize.width !== 0)
            if (x.get() > previewMaxWidth) {
                x.set(previewMaxWidth)
                setWidthInput(previewMaxWidth)
            } else if (x.get() < 200) {
                x.set(200)
                setWidthInput(200)
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize.width, setWidthInput])

    useEffect(() => {
        if (windowSize.width > 800) {
            setSettingsVisible(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowSize.width])

    useEffect(() => {
        if (screenshotState.open && (window.visualViewport?.width || window.innerWidth) > 800) {
            setSettingsVisible(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsVisible])

    useLayoutEffect(() => {
        setModelLocation()
    }, [setModelLocation, showModel, showNovelAI, windowSize.width, screenshotState.open])

    const createImage = async (
        toX: (node: HTMLDivElement, options?: htmlToImageOptions | undefined) => Promise<string>,
        then: (dataUrl: string) => void
    ) => {
        setPreparingImage(true)
        toast('Preparing image...')
        await loadFonts()
        const element = document.querySelector('#screenshot-container')
        if (element) {
            toX(element as HTMLDivElement, {
                skipAutoScale: true,
                pixelRatio: 1.5,
                quality: 0.85,
            }).then((dataUrl) => {
                then(dataUrl)
                setPreparingImage(false)
            })
        } else {
            toast('Failed to create image. Element not found.')
            setPreparingImage(false)
        }
    }

    return (
        <ScreenshotModalContainer>
            <ModalTitle>
                <div style={{ display: 'flex' }}>
                    {windowSize.width <= 800 && (
                        <SubtleButton
                            onClick={() => setSettingsVisible((v) => !v)}
                            style={{ paddingRight: 20 }}
                        >
                            <ArrowRightIcon />
                        </SubtleButton>
                    )}
                    <div>Screenshot Designer</div>
                </div>

                <CloseButton
                    style={{ position: 'static' }}
                    onClick={() => setScreenshotState({ ...screenshotState, open: false })}
                >
                    <div />
                </CloseButton>
            </ModalTitle>
            <FlexRow style={{ alignItems: 'stretch' }}>
                <Sidebar
                    left={true}
                    open={settingsVisible}
                    setOpen={setSettingsVisible}
                    modalSidebar
                    breakpointDesktop={'800px'}
                    breakpointMobile={'800px'}
                    noDragPoint={800}
                    style={{
                        height: 'unset',
                    }}
                >
                    <Settings ref={settingsRef}>
                        {windowSize.width <= 800 && (
                            <SubtleButton
                                onClick={() => setSettingsVisible((v) => !v)}
                                style={{ padding: 10, marginLeft: 'auto' }}
                            >
                                <ArrowLeftIcon />
                            </SubtleButton>
                        )}
                        <div style={{ opacity: 0.7, fontSize: '0.875rem', paddingBottom: 10 }}>Settings</div>
                        <AltCheckbox
                            value={showTitle}
                            setValue={setShowTitle}
                            text={'Show Title'}
                            label={'Show Title'}
                        />
                        <AltCheckbox
                            value={showDate}
                            setValue={setShowDate}
                            text={'Show Date'}
                            label={'Show Date'}
                        />
                        <AltCheckbox
                            value={showPenName}
                            setValue={setShowPenName}
                            text={'Show Pen Name'}
                            label={'Show Pen Name'}
                        />
                        <AltCheckbox
                            value={showNovelAI}
                            setValue={setShowNovelAI}
                            text={'Show NAI Logo'}
                            label={'Show NAI Logo'}
                        />
                        <AltCheckbox
                            value={showColors}
                            setValue={setShowColors}
                            text={'Show Color Highlighting'}
                            label={'Show Color Highlighting'}
                        />
                        {showColors && (
                            <AltCheckbox
                                value={showColorLegend}
                                setValue={setShowColorLegend}
                                text={'Show Color Legend'}
                                label={'Show Color Legend'}
                            />
                        )}
                        <AltCheckbox
                            value={showModel}
                            setValue={setShowModel}
                            text={'Show AI Model'}
                            label={'Show AI Model'}
                        />
                        <AltCheckbox
                            value={showBackground}
                            setValue={setShowBackground}
                            text={'Show Background'}
                            label={'Show Background'}
                        />
                        <FlexColSpacer min={10} max={10} />
                        <MinorSettingSliderCard
                            style={{ width: '250px', margin: 0 }}
                            title={'Font Size'}
                            value={fontSize}
                            onChange={(val) => {
                                setFontSize(val)
                                setTimeout(setModelLocation, 200)
                            }}
                            min={12}
                            max={24}
                            step={0.25}
                        />
                        <FlexColSpacer min={4} max={4} />
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, paddingBottom: 5 }}>
                                Theme:
                            </div>
                            <Radio
                                name={'Theme'}
                                selected={themeChoice}
                                choices={['custom', 'dark', 'light']}
                                names={['Current', 'Dark', 'Light']}
                                onChoiceSelected={(choice) => setThemeChoice(choice)}
                            />
                        </div>
                        <FlexColSpacer min={2} max={2} />
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, paddingBottom: 5 }}>
                                Width (px):
                            </div>

                            <input
                                type="number"
                                value={widthInput}
                                onChange={(e) => setWidthInput(e.target.valueAsNumber)}
                                onBlur={() => {
                                    const newWidth = Math.max(widthInput, 200)
                                    if (newWidth !== widthInput) {
                                        setWidthInput(newWidth)
                                    }
                                    setWidthBound(false)
                                    x.set(newWidth)
                                    setModelLocation()
                                }}
                            />
                        </div>
                    </Settings>
                </Sidebar>

                <PreviewPane>
                    <div style={{ opacity: 0.7, fontSize: '0.875rem', paddingBottom: 10 }}>Preview</div>
                    <DragContainer>
                        <motion.div style={{ width: width, position: 'relative', margin: 'auto' }}>
                            <ScreenshotContainer
                                style={{ width: width }}
                                paragraphIndent={getUserSetting(session.settings, 'paragraphIndent')}
                                paragraphSpacing={getUserSetting(session.settings, 'paragraphSpacing')}
                                lineSpacing={getUserSetting(session.settings, 'lineSpacing')}
                                fontSize={fontSize ?? 18}
                                id={'screenshot-container'}
                                theme={activeTheme}
                                background={showBackground}
                            >
                                <div id={'screenshot-header'}>
                                    {showTitle && (
                                        <FlexColSpacer min={20} max={20} id={'screenshot-space-top'} />
                                    )}
                                    {(showColorLegend ||
                                        showModel ||
                                        showNovelAI ||
                                        showPenName ||
                                        showDate) && (
                                        <FlexColSpacer min={10} max={10} id={'screenshot-space-top-2'} />
                                    )}
                                    {showTitle && (
                                        <>
                                            {!(
                                                screenshotState.start === 0 &&
                                                screenshotState.end ===
                                                    (currentStoryContent?.getStoryText().length ?? 0)
                                            ) && (
                                                <ExcerptFrom id={'screenshot-excerpt'}>
                                                    An excerpt from
                                                </ExcerptFrom>
                                            )}
                                            <Title id={'screenshot-title'} theme={activeTheme}>
                                                {currentStory?.title ?? ''}
                                            </Title>
                                        </>
                                    )}
                                    <div>
                                        {showPenName && (
                                            <PenName theme={activeTheme} id={'screenshot-penname'}>
                                                {'by ' +
                                                    (session.settings?.penName
                                                        ? getUserSetting(session.settings, 'penName')
                                                        : 'anonymous')}
                                            </PenName>
                                        )}
                                        {showDate && (
                                            <DateText theme={activeTheme} id={'screenshot-date'}>
                                                {dayjs().format('YYYY-MM-DD')}
                                            </DateText>
                                        )}
                                    </div>
                                    {(showTitle || showPenName || showDate) && (
                                        <FlexColSpacer
                                            min={showTitle ? 40 : 20}
                                            max={showTitle ? 40 : 20}
                                            id={'screenshot-space-upper'}
                                        />
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    {showBackground && (
                                        <svg
                                            id={'screenshot-leftquote'}
                                            style={{ position: 'absolute', left: -17, top: -23 }}
                                            width="82"
                                            height="66"
                                            viewBox="0 0 82 66"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M44.5737 28.7666L44.5616 40.625V60.9375C44.5616 62.0149 44.9881 63.0483 45.7474 63.8101C46.5067 64.572 47.5365 65 48.6103 65H72.9027C77.3684 65 81.0001 61.3559 81.0001 56.875V28.4375C81.0001 27.3601 80.5736 26.3267 79.8143 25.5649C79.055 24.803 78.0252 24.375 76.9514 24.375H64.5016C64.5155 24.0398 64.5437 23.7062 64.5858 23.375C64.7999 21.691 65.3746 20.0691 66.2749 18.6225C68.3398 15.4091 72.1982 13.2194 77.745 12.1062L81.0001 11.4522V0H76.9514C65.6838 0 57.0883 3.13219 51.408 9.31125C43.768 17.6312 44.5373 28.3156 44.5737 28.7666ZM52.1446 9.98761C57.577 4.07854 65.8636 1 76.9514 1H80.0001V10.6331L77.5482 11.1258C71.8641 12.2665 67.703 14.5502 65.4336 18.0819L65.4297 18.088L65.4259 18.0941C64.2572 19.972 63.5945 22.1219 63.5024 24.3334L63.4591 25.375H76.9514C77.7589 25.375 78.534 25.6968 79.106 26.2708C79.6781 26.8449 80.0001 27.6242 80.0001 28.4375V56.875C80.0001 60.8069 76.813 64 72.9027 64H48.6103C47.8028 64 47.0277 63.6782 46.4557 63.1042C45.8836 62.5301 45.5616 61.7508 45.5616 60.9375V40.625L45.5738 28.7267L45.5705 28.686C45.5386 28.2919 44.8036 17.9824 52.1446 9.98761Z"
                                                fill={activeTheme.colors.textMain}
                                                fillOpacity="0.2"
                                            />
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M0.0254576 40.625L0.0376036 28.7666C0.00116561 28.3156 -0.768091 17.6312 6.87185 9.31125C12.5522 3.13219 21.1477 0 32.4153 0H36.464V11.4522L33.2088 12.1062C27.6621 13.2194 23.8036 15.4091 21.7388 18.6225C20.8385 20.0691 20.2638 21.691 20.0497 23.375C20.0076 23.7062 19.9794 24.0398 19.9654 24.375H32.4153C33.4891 24.375 34.5189 24.803 35.2782 25.5649C36.0375 26.3267 36.464 27.3601 36.464 28.4375V56.875C36.464 61.3559 32.8323 65 28.3666 65H4.07418C3.00039 65 1.97059 64.572 1.2113 63.8101C0.452017 63.0483 0.0254576 62.0149 0.0254576 60.9375V40.625ZM32.4153 1C21.3275 1 13.0408 4.07854 7.60842 9.98761C0.267454 17.9824 1.0025 28.2919 1.03435 28.686L1.03765 28.7267L1.02546 40.625V60.9375C1.02546 61.7508 1.34748 62.5301 1.91961 63.1042C2.49162 63.6782 3.2667 64 4.07418 64H28.3666C32.2768 64 35.464 60.8069 35.464 56.875V28.4375C35.464 27.6242 35.142 26.8449 34.5699 26.2708C33.9978 25.6968 33.2228 25.375 32.4153 25.375H18.9229L18.9663 24.3334C19.0584 22.1219 19.7211 19.972 20.8898 18.0941L20.8936 18.088L20.8975 18.0819C23.1669 14.5502 27.328 12.2665 33.0121 11.1258L35.464 10.6331V1H32.4153Z"
                                                fill={activeTheme.colors.textMain}
                                                fillOpacity="0.2"
                                            />
                                        </svg>
                                    )}
                                    {showBackground && (
                                        <svg
                                            id={'screenshot-rightquote'}
                                            style={{
                                                position: 'absolute',
                                                right: -13,
                                                bottom: -34,
                                                transform: 'rotate(180deg)',
                                            }}
                                            width="81"
                                            height="65"
                                            viewBox="0 0 81 65"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M44.5737 28.7666L44.5616 40.625V60.9375C44.5616 62.0149 44.9881 63.0483 45.7474 63.8101C46.5067 64.572 47.5365 65 48.6103 65H72.9027C77.3684 65 81.0001 61.3559 81.0001 56.875V28.4375C81.0001 27.3601 80.5736 26.3267 79.8143 25.5649C79.055 24.803 78.0252 24.375 76.9514 24.375H64.5016C64.5155 24.0398 64.5437 23.7062 64.5858 23.375C64.7999 21.691 65.3746 20.0691 66.2749 18.6225C68.3398 15.4091 72.1982 13.2194 77.745 12.1062L81.0001 11.4522V0H76.9514C65.6838 0 57.0883 3.13219 51.408 9.31125C43.768 17.6312 44.5373 28.3156 44.5737 28.7666ZM52.1446 9.98761C57.577 4.07854 65.8636 1 76.9514 1H80.0001V10.6331L77.5482 11.1258C71.8641 12.2665 67.703 14.5502 65.4336 18.0819L65.4297 18.088L65.4259 18.0941C64.2572 19.972 63.5945 22.1219 63.5024 24.3334L63.4591 25.375H76.9514C77.7589 25.375 78.534 25.6968 79.106 26.2708C79.6781 26.8449 80.0001 27.6242 80.0001 28.4375V56.875C80.0001 60.8069 76.813 64 72.9027 64H48.6103C47.8028 64 47.0277 63.6782 46.4557 63.1042C45.8836 62.5301 45.5616 61.7508 45.5616 60.9375V40.625L45.5738 28.7267L45.5705 28.686C45.5386 28.2919 44.8036 17.9824 52.1446 9.98761Z"
                                                fill={activeTheme.colors.textMain}
                                                fillOpacity="0.2"
                                            />
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M0.0254576 40.625L0.0376036 28.7666C0.00116561 28.3156 -0.768091 17.6312 6.87185 9.31125C12.5522 3.13219 21.1477 0 32.4153 0H36.464V11.4522L33.2088 12.1062C27.6621 13.2194 23.8036 15.4091 21.7388 18.6225C20.8385 20.0691 20.2638 21.691 20.0497 23.375C20.0076 23.7062 19.9794 24.0398 19.9654 24.375H32.4153C33.4891 24.375 34.5189 24.803 35.2782 25.5649C36.0375 26.3267 36.464 27.3601 36.464 28.4375V56.875C36.464 61.3559 32.8323 65 28.3666 65H4.07418C3.00039 65 1.97059 64.572 1.2113 63.8101C0.452017 63.0483 0.0254576 62.0149 0.0254576 60.9375V40.625ZM32.4153 1C21.3275 1 13.0408 4.07854 7.60842 9.98761C0.267454 17.9824 1.0025 28.2919 1.03435 28.686L1.03765 28.7267L1.02546 40.625V60.9375C1.02546 61.7508 1.34748 62.5301 1.91961 63.1042C2.49162 63.6782 3.2667 64 4.07418 64H28.3666C32.2768 64 35.464 60.8069 35.464 56.875V28.4375C35.464 27.6242 35.142 26.8449 34.5699 26.2708C33.9978 25.6968 33.2228 25.375 32.4153 25.375H18.9229L18.9663 24.3334C19.0584 22.1219 19.7211 19.972 20.8898 18.0941L20.8936 18.088L20.8975 18.0819C23.1669 14.5502 27.328 12.2665 33.0121 11.1258L35.464 10.6331V1H32.4153Z"
                                                fill={activeTheme.colors.textMain}
                                                fillOpacity="0.2"
                                            />
                                        </svg>
                                    )}

                                    {selectedFragments.map((f, i) => (
                                        <p key={i}>
                                            {f.map((fragment, j) => (
                                                <TextFragment
                                                    theme={activeTheme}
                                                    key={j}
                                                    type={showColors ? fragment.origin : DataOrigin.unknown}
                                                >
                                                    {fragment.data}
                                                </TextFragment>
                                            ))}
                                            &nbsp;
                                        </p>
                                    ))}

                                    {showColorLegend && showColors && (
                                        <div
                                            id={'screenshot-color-legend'}
                                            style={{
                                                paddingTop: 20,
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {Object.entries(colors).map(([key, value], i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        marginRight: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            height: '1rem',
                                                            width: '1rem',
                                                            backgroundColor: value,
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            color: value,
                                                        }}
                                                    >
                                                        &nbsp;&nbsp;{key}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {(showModel || showNovelAI) && (
                                    <FlexColSpacer
                                        min={showTitle || showDate || showPenName ? 50 : 20}
                                        max={showTitle || showDate || showPenName ? 50 : 20}
                                        id={'screenshot-space-lower'}
                                    />
                                )}
                                <div
                                    id={'screenshot-footer'}
                                    style={{
                                        display: 'flex',
                                        flexDirection: lowerModel ? 'column-reverse' : 'row',
                                        alignItems: lowerModel ? 'flex-start' : 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    {showNovelAI && (
                                        <div
                                            id={'screenshot-novelai'}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <svg
                                                style={{
                                                    marginRight: '1.5ch',
                                                    display: 'inline',
                                                }}
                                                width={'1em'}
                                                viewBox="0 0 33 41"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M5.89418 31.9285C4.51814 29.6818 2.83212 27.8112 0.836131 26.521C0.26793 26.1537 0.124452 25.3382 0.540438 24.8047C4.15593 20.1672 9.79294 8.01868 12.7415 1.40215C13.181 0.416062 14.6883 0.738582 14.6883 1.81816V19.44C13.1242 20.1331 12.0332 21.6992 12.0332 23.5201C12.0332 24.1851 12.1787 24.8161 12.4397 25.383L5.89418 31.9285ZM7.34675 34.6814C8.03773 36.2042 8.61427 37.8368 9.07635 39.5334C9.19588 39.9722 9.59101 40.2824 10.0459 40.2824H16.4937H22.9416C23.3964 40.2824 23.7916 39.9722 23.9111 39.5334C24.3732 37.8368 24.9497 36.2042 25.6407 34.6814L22.211 31.2516L19.3551 34.1075C19.4281 34.3655 19.4672 34.6378 19.4672 34.9192C19.4672 36.5615 18.1358 37.8928 16.4935 37.8928C14.8512 37.8928 13.5198 36.5615 13.5198 34.9192C13.5198 33.2768 14.8512 31.9455 16.4935 31.9455C16.7448 31.9455 16.9888 31.9766 17.2219 32.0353L20.1083 29.1489L18.4762 27.5169C17.879 27.8137 17.2058 27.9806 16.4937 27.9806C15.7816 27.9806 15.1084 27.8137 14.5112 27.5169L7.34675 34.6814ZM27.0933 31.9285C28.4693 29.6818 30.1553 27.8112 32.1513 26.521C32.7195 26.1537 32.863 25.3382 32.447 24.8047C28.8315 20.1672 23.1945 8.01868 20.2459 1.40215C19.8065 0.416062 18.2992 0.738582 18.2992 1.81816V19.44C19.8632 20.1332 20.9542 21.6992 20.9542 23.5201C20.9542 24.1851 20.8087 24.8161 20.5478 25.383L27.0933 31.9285Z"
                                                    fill={activeTheme.colors.textMain}
                                                />
                                            </svg>
                                            <span
                                                style={{
                                                    flex: '1 1 auto',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                https://novelai.net
                                            </span>
                                        </div>
                                    )}
                                    {showModel && (
                                        <>
                                            <FlexColSpacer min={20} max={20} id={'screenshot-space-lower'} />
                                            <div
                                                id={'screenshot-model'}
                                                ref={modelRef}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <WrittenAlongside>Written alongside</WrittenAlongside>
                                                <ModelImage
                                                    id={'screenshot-model-image'}
                                                    theme={activeTheme}
                                                    src={selectedModel.bust.src}
                                                    alt={selectedModel.label}
                                                />
                                                <Model>{selectedModel.label}</Model>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </ScreenshotContainer>

                            <motion.div
                                title="drag to resize"
                                drag="x"
                                dragConstraints={{
                                    left: 200,
                                    right: previewMaxWidth,
                                }}
                                dragElastic={false}
                                dragMomentum={false}
                                style={{
                                    x: x,
                                    cursor: 'col-resize',
                                    width: `${DRAG_HANDLE_WIDTH}px`,
                                    height: '100%',
                                    position: 'absolute',
                                    top: 0,
                                }}
                                onDrag={() => {
                                    // handles a bug(?) where after resizing the window the dragConstraints are not respected
                                    if (widthBound)
                                        if (x.get() > previewMaxWidth) {
                                            x.set(previewMaxWidth)
                                            setWidthInput(previewMaxWidth)
                                        } else if (x.get() < 200) {
                                            x.set(200)
                                            setWidthInput(200)
                                        }
                                    setModelLocation()
                                }}
                                onDragStart={() => {
                                    setDragging(true)
                                    setWidthBound(true)
                                }}
                                onDragEnd={() => {
                                    setDragging(false)
                                    setWidthInput(Math.floor(x.get()))
                                }}
                            >
                                <DragHandle dragging={dragging}>
                                    <FlexRow
                                        style={{
                                            height: '100%',
                                            justifyContent: 'space-around',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <ArrowLeftIcon style={{ width: '6px' }} />
                                        <ArrowRightIcon style={{ width: '6px' }} />
                                    </FlexRow>
                                </DragHandle>
                            </motion.div>
                        </motion.div>
                    </DragContainer>
                    <FlexColSpacer min={20} max={20} />
                    <FlexRow style={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
                        {navigator.clipboard?.write && (
                            <LightColorButton
                                disabled={preparingImage}
                                onClick={async () => {
                                    createImage(toPng, (dataUrl) => {
                                        const blob = dataURItoBlob(dataUrl)
                                        navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
                                        toast('Image copied to clipboard')
                                    })
                                }}
                            >
                                To Clipboard
                            </LightColorButton>
                        )}
                        <LightColorButton
                            bordered
                            disabled={preparingImage}
                            onClick={async () => {
                                createImage(toJpeg, (dataUrl) => {
                                    const link = document.createElement('a')
                                    link.download = `screenshot-${
                                        currentStory?.title ?? ''
                                    }-${new Date().toISOString()}.jpg`
                                    if (!showTitle || !currentStory?.title)
                                        link.download = `screenshot-${new Date().toISOString()}.jpg`
                                    link.href = dataUrl
                                    link.click()
                                })
                            }}
                        >
                            Download JPG
                        </LightColorButton>
                        <LightColorButton
                            bordered
                            disabled={preparingImage}
                            onClick={async () => {
                                createImage(toPng, (dataUrl) => {
                                    const link = document.createElement('a')
                                    link.download = `screenshot-${
                                        currentStory?.title ?? ''
                                    }-${new Date().toISOString()}.png`
                                    if (!showTitle || !currentStory?.title)
                                        link.download = `screenshot-${new Date().toISOString()}.png`
                                    link.href = dataUrl
                                    link.click()
                                })
                            }}
                        >
                            Download PNG
                        </LightColorButton>
                    </FlexRow>
                </PreviewPane>
            </FlexRow>
        </ScreenshotModalContainer>
    )
}

function dataURItoBlob(dataURI: string) {
    // convert base64 to raw binary data held in a string
    const byteString = Buffer.from(dataURI.split(',')[1], 'base64')

    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length)

    // create a view into the buffer
    const ia = new Uint8Array(ab)

    // set the bytes of the buffer to the correct values
    for (const [i, element] of byteString.entries()) {
        ia[i] = element
    }

    // write the ArrayBuffer to a blob, and you're done
    const blob = new Blob([ab], { type: mimeString })
    return blob
}

const loadedFonts: string[] = []

const loadFont = async (url: string): Promise<void> => {
    if (loadedFonts.includes(url)) {
        return
    }
    const response = await fetch(url)
    const css = await response.text()
    const head = document.querySelectorAll('head')[0]
    const style = document.createElement('style')
    style.append(document.createTextNode(css))
    head.append(style)
    loadedFonts.push(url)
    return
}
