import { useCallback, useEffect, useRef } from 'react'

// Chargement paresseux et partagé (une seule fois par page) des deux SDK externes
// nécessaires pour piloter la lecture (play/pause/volume) depuis du JS plutôt que
// de se contenter d'un <iframe src=...> statique.
let youTubeApiPromise = null
function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (youTubeApiPromise) return youTubeApiPromise
  youTubeApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }
  })
  return youTubeApiPromise
}

let spotifyApiPromise = null
function loadSpotifyIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (spotifyApiPromise) return spotifyApiPromise
  spotifyApiPromise = new Promise((resolve) => {
    if (window.__spotifyIframeApi) {
      resolve(window.__spotifyIframeApi)
      return
    }
    const previous = window.onSpotifyIframeApiReady
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      previous?.(IFrameAPI)
      window.__spotifyIframeApi = IFrameAPI
      resolve(IFrameAPI)
    }
    if (!document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]')) {
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      document.head.appendChild(script)
    }
  })
  return spotifyApiPromise
}

// Les SDK externes (surtout l'iFrame API Spotify) évoluent/varient selon les
// versions et n'exposent pas forcément toutes les méthodes qu'on voudrait
// (ex: pas de setVolume documenté partout) : on ne suppose jamais qu'une
// méthode existe, on l'appelle "en sécurité" pour ne jamais planter le jeu.
function safeCall(obj, method, ...args) {
  if (obj && typeof obj[method] === 'function') {
    try {
      return obj[method](...args)
    } catch {
      /* SDK tiers : on dégrade silencieusement plutôt que de casser la partie */
    }
  }
  return undefined
}

const FADE_STEPS = 12

// Fenêtre dans laquelle on tire le point de départ aléatoire d'une vidéo YouTube
// (ni le tout début, ni trop proche de la fin) — Spotify le fait déjà de son
// côté (aperçu centré sur un extrait), on réplique le même esprit ici.
const RANDOM_START_MIN_RATIO = 0.15
const RANDOM_START_MAX_RATIO = 0.65
const RANDOM_START_MIN_DURATION = 25 // en dessous, la vidéo est trop courte pour que ça ait du sens

/**
 * Lecteur audio "caché" pour le blind test : pilote un lecteur YouTube et un
 * lecteur Spotify via leurs SDK officiels. Les deux widgets sont montés dans un
 * conteneur invisible (mais pas `display:none`, ce que les navigateurs exigent
 * pour autoriser la lecture avec son) géré en interne — rien à rendre côté
 * composant appelant.
 *
 * Limite connue : l'iFrame API Spotify n'expose pas de contrôle de volume
 * programmatique (contrairement à YouTube) — le curseur de volume n'a donc
 * d'effet réel que sur les tracks YouTube ; côté Spotify seuls play/pause sont
 * garantis (le fade-out se traduit par un arrêt franc, pas un fondu audio).
 */
export function useHiddenPlayer(initialVolume = 70) {
  const containerRef = useRef(null)
  const ytElRef = useRef(null)
  const spotifyElRef = useRef(null)

  const ytPlayerRef = useRef(null)
  const ytReadyRef = useRef(false)
  const spotifyControllerRef = useRef(null)
  const spotifyReadyRef = useRef(false)

  const volumeRef = useRef(initialVolume)
  const activeTypeRef = useRef(null)
  const fadeTimerRef = useRef(null)
  const pendingRef = useRef(null) // { type, id } demandé avant que le SDK correspondant soit prêt
  const pendingRandomSeekRef = useRef(false) // démarre la prochaine vidéo YouTube à un instant aléatoire

  useEffect(() => {
    const container = document.createElement('div')
    container.setAttribute('data-hidden-player', 'true')
    Object.assign(container.style, {
      position: 'fixed',
      left: '0',
      bottom: '0',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      opacity: '0.01',
      pointerEvents: 'none',
      zIndex: '-1'
    })
    document.body.appendChild(container)
    containerRef.current = container

    const ytEl = document.createElement('div')
    container.appendChild(ytEl)
    ytElRef.current = ytEl

    const spotifyEl = document.createElement('div')
    container.appendChild(spotifyEl)
    spotifyElRef.current = spotifyEl

    return () => {
      clearInterval(fadeTimerRef.current)
      safeCall(ytPlayerRef.current, 'destroy')
      container.remove()
    }
  }, [])

  const flushPending = useCallback(() => {
    if (!pendingRef.current) return
    const { type, id } = pendingRef.current
    if (type === 'youtube' && ytReadyRef.current) {
      pendingRef.current = null
      pendingRandomSeekRef.current = true
      safeCall(ytPlayerRef.current, 'loadVideoById', id)
      activeTypeRef.current = 'youtube'
    } else if (type === 'spotify' && spotifyReadyRef.current) {
      pendingRef.current = null
      safeCall(spotifyControllerRef.current, 'loadUri', `spotify:track:${id}`)
      safeCall(spotifyControllerRef.current, 'play')
      activeTypeRef.current = 'spotify'
    }
  }, [])

  /** Si une lecture aléatoire est en attente, saute à un point aléatoire dès que
   * la vidéo commence réellement à jouer (getDuration() n'est fiable qu'à ce moment). */
  const maybeApplyRandomSeek = useCallback(() => {
    if (!pendingRandomSeekRef.current) return
    pendingRandomSeekRef.current = false
    const duration = safeCall(ytPlayerRef.current, 'getDuration') || 0
    if (duration < RANDOM_START_MIN_DURATION) return
    const min = duration * RANDOM_START_MIN_RATIO
    const max = duration * RANDOM_START_MAX_RATIO
    const target = min + Math.random() * (max - min)
    safeCall(ytPlayerRef.current, 'seekTo', target, true)
  }, [])

  const ensureYouTube = useCallback(() => {
    if (ytPlayerRef.current) return
    ytPlayerRef.current = 'pending' // évite une double init si appelé deux fois vite
    loadYouTubeApi().then((YT) => {
      ytPlayerRef.current = new YT.Player(ytElRef.current, {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            ytReadyRef.current = true
            safeCall(ytPlayerRef.current, 'setVolume', volumeRef.current)
            flushPending()
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) maybeApplyRandomSeek()
          }
        }
      })
    })
  }, [flushPending, maybeApplyRandomSeek])

  const ensureSpotify = useCallback(() => {
    if (spotifyControllerRef.current) return
    spotifyControllerRef.current = 'pending'
    loadSpotifyIframeApi().then((IFrameAPI) => {
      IFrameAPI.createController(
        spotifyElRef.current,
        { width: '1', height: '1', uri: '' },
        (controller) => {
          spotifyControllerRef.current = controller
          spotifyReadyRef.current = true
          safeCall(controller, 'setVolume', volumeRef.current / 100)
          flushPending()
        }
      )
    })
  }, [flushPending])

  /** Charge et joue immédiatement la track donnée, en coupant l'autre lecteur. */
  const load = useCallback(({ type, id }) => {
    clearInterval(fadeTimerRef.current)
    if (!type || !id) return

    if (activeTypeRef.current && activeTypeRef.current !== type) {
      if (activeTypeRef.current === 'youtube') safeCall(ytPlayerRef.current, 'stopVideo')
      if (activeTypeRef.current === 'spotify') safeCall(spotifyControllerRef.current, 'pause')
    }

    if (type === 'youtube') {
      ensureYouTube()
      if (ytReadyRef.current) {
        safeCall(ytPlayerRef.current, 'setVolume', volumeRef.current)
        pendingRandomSeekRef.current = true
        safeCall(ytPlayerRef.current, 'loadVideoById', id)
        activeTypeRef.current = 'youtube'
      } else {
        pendingRef.current = { type, id }
      }
    } else if (type === 'spotify') {
      ensureSpotify()
      if (spotifyReadyRef.current) {
        safeCall(spotifyControllerRef.current, 'setVolume', volumeRef.current / 100)
        safeCall(spotifyControllerRef.current, 'loadUri', `spotify:track:${id}`)
        safeCall(spotifyControllerRef.current, 'play')
        activeTypeRef.current = 'spotify'
      } else {
        pendingRef.current = { type, id }
      }
    }
  }, [ensureYouTube, ensureSpotify])

  const pause = useCallback(() => {
    if (activeTypeRef.current === 'youtube') safeCall(ytPlayerRef.current, 'pauseVideo')
    if (activeTypeRef.current === 'spotify') safeCall(spotifyControllerRef.current, 'pause')
  }, [])

  const stop = useCallback(() => {
    clearInterval(fadeTimerRef.current)
    pendingRef.current = null
    pendingRandomSeekRef.current = false
    if (activeTypeRef.current === 'youtube') safeCall(ytPlayerRef.current, 'stopVideo')
    if (activeTypeRef.current === 'spotify') safeCall(spotifyControllerRef.current, 'pause')
    activeTypeRef.current = null
  }, [])

  const setVolume = useCallback((value) => {
    const v = Math.max(0, Math.min(100, value))
    volumeRef.current = v
    safeCall(ytPlayerRef.current, 'setVolume', v)
    safeCall(spotifyControllerRef.current, 'setVolume', v / 100)
  }, [])

  /** Baisse le volume progressivement jusqu'à 0 puis coupe la lecture (transition entre questions). */
  const fadeOutAndStop = useCallback((durationMs = 900) => {
    return new Promise((resolve) => {
      clearInterval(fadeTimerRef.current)
      const startVolume = volumeRef.current
      if (startVolume <= 0 || !activeTypeRef.current) {
        stop()
        resolve()
        return
      }
      let step = 0
      fadeTimerRef.current = setInterval(() => {
        step += 1
        const ratio = 1 - step / FADE_STEPS
        const v = Math.max(0, Math.round(startVolume * ratio))
        safeCall(ytPlayerRef.current, 'setVolume', v)
        safeCall(spotifyControllerRef.current, 'setVolume', v / 100)
        if (step >= FADE_STEPS) {
          clearInterval(fadeTimerRef.current)
          stop()
          // Restaure le volume "cible" pour la prochaine track (le fade ne doit
          // affecter que la transition, pas le réglage utilisateur).
          safeCall(ytPlayerRef.current, 'setVolume', startVolume)
          safeCall(spotifyControllerRef.current, 'setVolume', startVolume / 100)
          resolve()
        }
      }, durationMs / FADE_STEPS)
    })
  }, [stop])

  return { load, pause, stop, setVolume, fadeOutAndStop }
}
