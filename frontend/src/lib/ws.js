/**
 * Live telemetry over one WebSocket: the backend pushes on a single multiplexed channel (see
 * its `realtime.py`) and replays each topic's last message on connect. Reconnects with
 * backoff, because a local backend restarts often.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

const RECONNECT_MIN = 500
const RECONNECT_MAX = 10_000
/** Silence that means the socket is gone. The backend pings every 25s when nothing else is
 * happening, so this only fires when the connection died without closing — a sleep, a
 * suspended VM, a dropped tunnel — which leaves the socket reading OPEN forever. */
const SILENCE_MS = 60_000
class Telemetry {
  socket = null
  handlers = new Map()
  statusHandlers = new Set()
  delay = RECONNECT_MIN
  connected = false
  silence = null
  pingWorker = null
  pingInterval = null
  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${location.host}/ws`)
    this.socket = socket
    socket.onopen = () => {
      this.delay = RECONNECT_MIN
      this.setConnected(true)
      this.heard()
      this.startKeepalive()
    }
    socket.onmessage = (event) => {
      this.heard()
      let envelope
      try {
        envelope = JSON.parse(event.data)
      } catch {
        return
      }
      if (!envelope.topic || envelope.topic === 'ping') return
      for (const handler of this.handlers.get(envelope.topic) ?? []) handler(envelope.payload)
    }
    socket.onclose = () => {
      this.stopKeepalive()
      if (this.silence) clearTimeout(this.silence)
      this.silence = null
      this.setConnected(false)
      this.socket = null
      setTimeout(() => this.connect(), this.delay)
      this.delay = Math.min(this.delay * 2, RECONNECT_MAX)
    }
    socket.onerror = () => socket.close()
  }
  startKeepalive() {
    this.stopKeepalive()
    // Background tabs throttle main-thread timers, but Web Workers continue ticking
    try {
      const code = 'setInterval(() => postMessage("ping"), 15000);'
      const blob = new Blob([code], {
        type: 'application/javascript',
      })
      const url = URL.createObjectURL(blob)
      this.pingWorker = new Worker(url)
      this.pingWorker.onmessage = () => this.sendPing()
    } catch {
      this.pingInterval = setInterval(() => this.sendPing(), 15000)
    }
  }
  stopKeepalive() {
    if (this.pingWorker) {
      try {
        this.pingWorker.terminate()
      } catch {}
      this.pingWorker = null
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
  sendPing() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send('ping')
      } catch {}
    }
  }
  checkAndReconnect() {
    if (!this.socket || this.socket.readyState >= WebSocket.CLOSING) {
      if (this.socket) {
        try {
          this.socket.close()
        } catch {}
        this.socket = null
      }
      this.delay = RECONNECT_MIN
      this.connect()
    } else if (this.socket.readyState === WebSocket.OPEN) {
      this.sendPing()
    }
  }

  /** Restart the silence timer. Closing a dead socket is what starts the reconnect. */
  heard() {
    if (this.silence) clearTimeout(this.silence)
    this.silence = setTimeout(() => {
      this.silence = null
      this.socket?.close()
    }, SILENCE_MS)
  }
  setConnected(connected) {
    this.connected = connected
    for (const handler of this.statusHandlers) handler(connected)
  }
  subscribe(topic, handler) {
    const set = this.handlers.get(topic) ?? new Set()
    set.add(handler)
    this.handlers.set(topic, set)
    return () => set.delete(handler)
  }
  onStatus(handler) {
    this.statusHandlers.add(handler)
    // Report the current state at once: the socket opens long before components mount.
    handler(this.connected)
    return () => this.statusHandlers.delete(handler)
  }
}
export const telemetry = new Telemetry()

/**
 * Refetch queries under `queryKey` whenever `topic` reports a change. The socket is a signal,
 * not state, so a drifting payload shape can never desync the UI; bursts collapse to one
 * refetch per `minGapMs`, with a trailing call so the final state still lands.
 */
export function useRefetchOn(topic, queryKey, minGapMs = 1000) {
  const queryClient = useQueryClient()
  const last = useRef(0)
  const pending = useRef(null)
  // Read when a message lands, so one subscription serves every render.
  const latest = useRef({
    queryKey,
    minGapMs,
  })
  useEffect(() => {
    latest.current = {
      queryKey,
      minGapMs,
    }
  })
  useEffect(() => {
    const unsubscribe = telemetry.subscribe(topic, () => {
      const fire = () => {
        last.current = Date.now()
        pending.current = null
        void queryClient.invalidateQueries({
          queryKey: latest.current.queryKey,
        })
      }
      const gap = latest.current.minGapMs
      const since = Date.now() - last.current
      if (since >= gap) fire()
      else if (!pending.current) pending.current = setTimeout(fire, gap - since)
    })
    return () => {
      unsubscribe()
      if (pending.current) clearTimeout(pending.current)
      pending.current = null
    }
  }, [topic, queryClient])
}
let registeredQueryClient = null
export function registerQueryClient(client) {
  registeredQueryClient = client
}

// Ensure active tab switching triggers immediate refresh and WebSocket verification
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const onFocusOrVisible = () => {
    if (document.visibilityState === 'visible') {
      telemetry.checkAndReconnect()
      if (registeredQueryClient) {
        void registeredQueryClient.invalidateQueries()
      }
    }
  }
  document.addEventListener('visibilitychange', onFocusOrVisible)
  window.addEventListener('focus', onFocusOrVisible)
  window.addEventListener('online', onFocusOrVisible)
}
