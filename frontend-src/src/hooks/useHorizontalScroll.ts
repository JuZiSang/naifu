import { useRef, useEffect, MutableRefObject } from 'react'

export function useHorizontalScroll(): MutableRefObject<any> {
    const elRef = useRef<any>(null)
    useEffect(() => {
        const el: any = elRef.current
        if (el) {
            const onWheel = (e: any) => {
                if (e.deltaY == 0) return
                e.preventDefault()
                el.scrollTo({
                    left: el.scrollLeft + e.deltaY,
                    //`behavior: "smooth"
                })
            }
            el.addEventListener('wheel', onWheel)
            return () => el.removeEventListener('wheel', onWheel)
        }
    }, [])
    return elRef
}
