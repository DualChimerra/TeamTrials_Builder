import { useEffect, useState } from 'react'
import { loadGameData, type GameData } from './load'

export function useGameData() {
  const [data, setData] = useState<GameData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadGameData()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e)))
    return () => {
      alive = false
    }
  }, [])
  return { data, error, loading: !data && !error }
}
