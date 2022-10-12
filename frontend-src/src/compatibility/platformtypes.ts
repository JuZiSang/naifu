//For React Native
/*
import { SvgProps } from 'react-native-svg'
import { ImageSourcePropType } from 'react-native'

export type PlatformSvgData = React.FC<
    SvgProps & {
        primary?: string
        secondary?: string
    }
>

export type PlatformImageData = ImageSourcePropType
*/

//For regular React
export type PlatformSvgData = any
import { StaticImageData } from 'next/image'
export type PlatformImageData = StaticImageData

export const isRN = false
