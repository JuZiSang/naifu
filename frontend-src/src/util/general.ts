export function fetchWithTimeout(
    url: string,
    params: RequestInit = {},
    timeout: number = 60000,
    errorMessage?: string
): Promise<Response> {
    return Promise.race([
        fetch(url, params),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage ?? `Timeout fetching ${url}`)), timeout)
        ),
    ])
}
