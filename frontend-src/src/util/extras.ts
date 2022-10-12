export function playAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url)
        audio.addEventListener('ended', () => resolve())
        audio.addEventListener('error', (error) => reject(error))
        audio.volume = 0.6
        audio.play()
    })
}
