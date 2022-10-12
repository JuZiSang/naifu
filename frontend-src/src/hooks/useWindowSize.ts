import { useState, useEffect, useRef } from 'react'

export interface WindowSize {
    width: number
    height: number
    prevWidth: number
    prevHeight: number
}

export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0,
        prevWidth: 0,
        prevHeight: 0,
    })

    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            // Set window width/height to state
            setWindowSize((v) => {
                return {
                    width: window.visualViewport?.width || window.innerWidth,
                    height: window.visualViewport?.height || window.innerHeight,
                    prevWidth: v.width,
                    prevHeight: v.height,
                }
            })
        }

        // Add event listener
        window.addEventListener('resize', handleResize)

        // Call handler right away so state gets updated with initial window size
        handleResize()

        // Remove event listener on cleanup
        return () => {
            window.removeEventListener('resize', handleResize)
            setWindowSize({
                width: 0,
                height: 0,
                prevWidth: 0,
                prevHeight: 0,
            })
        }
    }, []) // Empty array ensures that effect is only run on mount

    return windowSize
}

export function useWindowSizeBreakpoint(width: number, height: number): WindowSize {
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0,
        prevWidth: 0,
        prevHeight: 0,
    })
    const windowSizeRef = useRef(windowSize)
    windowSizeRef.current = windowSize

    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            const size = {
                width: window.visualViewport?.width || window.innerWidth,
                height: window.visualViewport?.height || window.innerHeight,
            }
            // only update size when new size crosses breakpoint
            if (
                windowSizeRef.current.width === 0 ||
                windowSizeRef.current.height === 0 ||
                (height !== 0 && size.height >= height && windowSizeRef.current.height < height) ||
                (width !== 0 && size.width >= width && windowSizeRef.current.width < width) ||
                (height !== 0 && size.height < height && windowSizeRef.current.height >= height) ||
                (width !== 0 && size.width < width && windowSizeRef.current.width >= width)
            ) {
                setWindowSize((v) => {
                    return {
                        width: window.visualViewport?.width || window.innerWidth,
                        height: window.visualViewport?.height || window.innerHeight,
                        prevWidth: v.width,
                        prevHeight: v.height,
                    }
                })
            }
        }

        // Add event listener
        window.addEventListener('resize', handleResize)

        // Call handler right away so state gets updated with initial window size
        handleResize()

        // Remove event listener on cleanup
        return () => {
            window.removeEventListener('resize', handleResize)
            setWindowSize({
                width: 0,
                height: 0,
                prevWidth: 0,
                prevHeight: 0,
            })
        }
    }, [height, width])

    return windowSize
}
