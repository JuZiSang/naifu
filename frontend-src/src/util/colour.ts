import moize from 'moize'
import {
    transparentize as polishedTransparentize,
    adjustHue as polishedAdjustHue,
    mix as polishedMix,
    darken as polishedDarken,
    lighten as polishedLighten,
    complement as polishedComplement,
    invert as polishedInvert,
    getLuminance as polishedGetLuminance,
    getContrast as polishedGetContrast,
} from 'polished'
import { logError } from './browser'

export const transparentize = moize({ maxSize: 50 })((amount: number, color: string): string => {
    try {
        return polishedTransparentize(amount, color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})

export const adjustHue = moize({ maxSize: 50 })((amount: number, color: string): string => {
    try {
        return polishedAdjustHue(amount, color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})

export const darken = moize({ maxSize: 50 })((amount: number, color: string): string => {
    try {
        return polishedDarken(amount, color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})
export const lighten = moize({ maxSize: 50 })((amount: number, color: string): string => {
    try {
        return polishedLighten(amount, color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})

export const mix = moize({ maxSize: 50 })((weight: number, color: string, otherColor: string): string => {
    try {
        return polishedMix(weight, color, otherColor)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})

export const complement = moize({ maxSize: 50 })((color: string): string => {
    try {
        return polishedComplement(color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})

export const invert = moize({ maxSize: 50 })((color: string): string => {
    try {
        return polishedInvert(color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return '#ff0000'
    }
})

export const getLuminance = moize({ maxSize: 50 })((color: string): number => {
    try {
        return polishedGetLuminance(color)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return 0
    }
})

export const getContrast = moize({ maxSize: 50 })((color: string, otherColor: string): number => {
    try {
        return polishedGetContrast(color, otherColor)
    } catch (error) {
        logError(new Error('Error with color value ' + color + ' : ' + error), false)
        return 0
    }
})

export function colorIsLight(color: string): boolean {
    return getLuminance(color) > 0.179
}
