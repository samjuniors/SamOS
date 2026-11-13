import { useStore } from '@nanostores/react'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Home,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Tv,
  X
} from 'lucide-react'
import { atom } from 'nanostores'
import { useEffect, useRef, useState } from 'react'

export interface BrowserTab {
  id: string
  title: string
  url: string
  icon?: string
}

export const $browserCurrentUrl = atom<string>('https://www.youtube.com')
export const $browserTabs = atom<BrowserTab[]>([
  { id: 'tab_youtube', title: 'YouTube', url: 'https://www.youtube.com' },
  { id: 'tab_github', title: 'GitHub', url: 'https://github.com' },
  { id: 'tab_google', title: 'Google', url: 'https://www.google.com' }
])
export const $activeTabId = atom<string>('tab_youtube')

/** Navigate active browser tab to a URL or search query */
export function navigateToUrl(rawInput: string, openPopup = false): void {
  let url = rawInput.trim()

  if (!url) {return}

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.') && !url.includes(' ')) {
      url = `https://${url}`
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
    }
  }

  $browserCurrentUrl.set(url)

  // Update active tab
  const tabs = $browserTabs.get()
  const activeId = $activeTabId.get()
  const updated = tabs.map(t => (t.id === activeId ? { ...t, url, title: extractDomain(url) } : t))
  $browserTabs.set(updated)

  if (openPopup) {
    const cuaApi = (window as unknown as { hermesDesktop?: { cua?: { openBrowserPopup?: (u: string) => Promise<unknown> } } }).hermesDesktop?.cua

    if (cuaApi?.openBrowserPopup) {
      void cuaApi.openBrowserPopup(url)
    } else {
      window.open(url, '_blank', 'width=1200,height=800')
    }
  }
}

function extractDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr)

    return u.hostname.replace(/^www\./, '')
  } catch {
    return 'Web'
  }
}

export function BrowserWorkspace() {
  const currentUrl = useStore($browserCurrentUrl)
  const tabs = useStore($browserTabs)
  const activeTabId = useStore($activeTabId)

  const [inputUrl, setInputUrl] = useState(currentUrl)
  const [iframeKey, setIframeKey] = useState(0)
  const [history, setHistory] = useState<string[]>([currentUrl])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setInputUrl(currentUrl)
  }, [currentUrl])

  const handleNavigate = (url: string) => {
    navigateToUrl(url)
    setHistory(prev => [...prev.slice(0, historyIndex + 1), url])
    setHistoryIndex(prev => prev + 1)
    setIsLoading(true)
  }

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevUrl = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      $browserCurrentUrl.set(prevUrl)
    }
  }

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextUrl = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      $browserCurrentUrl.set(nextUrl)
    }
  }

  const handleReload = () => {
    setIframeKey(k => k + 1)
    setIsLoading(true)
  }

  const handleOpenPopup = () => {
    const cuaApi = (window as unknown as { hermesDesktop?: { cua?: { openBrowserPopup?: (u: string) => Promise<unknown> } } }).hermesDesktop?.cua

    if (cuaApi?.openBrowserPopup) {
      void cuaApi.openBrowserPopup(currentUrl)
    } else {
      window.open(currentUrl, '_blank', 'width=1240,height=820')
    }
  }

  const handleOpenSystem = () => {
    const cuaApi = (window as unknown as { hermesDesktop?: { cua?: { openSystemUrl?: (u: string) => Promise<unknown> } } }).hermesDesktop?.cua

    if (cuaApi?.openSystemUrl) {
      void cuaApi.openSystemUrl(currentUrl)
    } else {
      window.open(currentUrl, '_blank')
    }
  }

  const QUICK_LINKS = [
    { name: 'YouTube', url: 'https://www.youtube.com', icon: Tv, color: 'text-[#ff6a00]' },
    { name: 'GitHub', url: 'https://github.com', icon: Globe, color: 'text-slate-200' },
    { name: 'Google', url: 'https://www.google.com', icon: Search, color: 'text-[#ff7f24]' },
    { name: 'HuggingFace', url: 'https://huggingface.co', icon: Sparkles, color: 'text-amber-400' }
  ]

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0e12] text-slate-100 overflow-hidden select-none">
      {/* Top Tab Strip (Matte Black 60%, Storm Grey 30%, Safety Orange 10%) */}
      <div className="flex items-center px-3 pt-2 bg-[#101318] border-b border-[#262c37] gap-1.5 shrink-0 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId

          return (
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-xl text-xs font-medium cursor-pointer transition-colors max-w-[200px] border-t border-x ${
                isActive
                  ? 'bg-[#1b202a] border-[#383f4d] text-white shadow-sm border-t-[#ff6a00]'
                  : 'bg-[#101318] border-transparent text-[#9aa5b8] hover:text-slate-200 hover:bg-[#161a22]'
              }`}
              key={tab.id}
              onClick={() => {
                $activeTabId.set(tab.id)
                $browserCurrentUrl.set(tab.url)
              }}
            >
              <Globe className="size-3.5 shrink-0 text-[#ff6a00]" />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  className="p-0.5 rounded hover:bg-[#262c37] text-[#9aa5b8] hover:text-white"
                  onClick={e => {
                    e.stopPropagation()
                    const next = tabs.filter(t => t.id !== tab.id)
                    $browserTabs.set(next)

                    if (tab.id === activeTabId && next[0]) {
                      $activeTabId.set(next[0].id)
                      $browserCurrentUrl.set(next[0].url)
                    }
                  }}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* New Tab Button */}
        <button
          className="p-1 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#1b202a] transition-colors ml-1 cursor-pointer"
          onClick={() => {
            const newTab: BrowserTab = {
              id: `tab_${Date.now()}`,
              title: 'New Tab',
              url: 'https://www.google.com'
            }

            $browserTabs.set([...tabs, newTab])
            $activeTabId.set(newTab.id)
            $browserCurrentUrl.set(newTab.url)
          }}
          title="Open New Tab"
          type="button"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Navigation & Address Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#14171f] border-b border-[#262c37] shrink-0">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#1b202a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            disabled={historyIndex <= 0}
            onClick={handleBack}
            title="Back"
            type="button"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            className="p-1.5 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#1b202a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            disabled={historyIndex >= history.length - 1}
            onClick={handleForward}
            title="Forward"
            type="button"
          >
            <ArrowRight className="size-4" />
          </button>
          <button
            className={`p-1.5 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#1b202a] transition-colors cursor-pointer ${
              isLoading ? 'animate-spin text-[#ff6a00]' : ''
            }`}
            onClick={handleReload}
            title="Reload page"
            type="button"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            className="p-1.5 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#1b202a] transition-colors cursor-pointer"
            onClick={() => handleNavigate('https://www.google.com')}
            title="Home"
            type="button"
          >
            <Home className="size-4" />
          </button>
        </div>

        {/* URL Input */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090b0e] border border-[#262c37] focus-within:border-[#ff6a00] transition-colors">
          <Shield className="size-3.5 text-[#ff6a00] shrink-0" />
          <input
            className="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder:text-[#9aa5b8]/50 focus:outline-none font-mono"
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleNavigate(inputUrl)
              }
            }}
            placeholder="Enter web address or search query..."
            type="text"
            value={inputUrl}
          />
        </div>

        {/* Quick Shortcuts */}
        <div className="hidden lg:flex items-center gap-1 border-l border-[#262c37] pl-2">
          {QUICK_LINKS.map(item => {
            const Icon = item.icon

            return (
              <button
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[#1b202a] transition-colors cursor-pointer ${item.color}`}
                key={item.name}
                onClick={() => handleNavigate(item.url)}
                title={`Open ${item.name}`}
                type="button"
              >
                <Icon className="size-3.5" />
                <span>{item.name}</span>
              </button>
            )
          })}
        </div>

        {/* Window & Popup Controls */}
        <div className="flex items-center gap-1 border-l border-[#262c37] pl-2">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#ff6a00]/15 text-[#ff7f24] hover:bg-[#ff6a00]/25 border border-[#ff6a00]/40 transition-colors shadow-sm shadow-[#ff6a00]/15 cursor-pointer"
            onClick={handleOpenPopup}
            title="Pop out into a dedicated floating window"
            type="button"
          >
            <Maximize2 className="size-3.5" />
            <span>Dedicated Popup</span>
          </button>
          <button
            className="p-1.5 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-[#1b202a] transition-colors cursor-pointer"
            onClick={handleOpenSystem}
            title="Open in System Browser"
            type="button"
          >
            <ExternalLink className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Browser Viewport */}
      <div className="flex-1 relative bg-[#090b0e] flex flex-col items-center justify-center overflow-hidden">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          className="w-full h-full border-none bg-white/95"
          key={iframeKey}
          onLoad={() => setIsLoading(false)}
          ref={iframeRef}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          src={currentUrl}
          title="Hermes Workspace Browser Viewport"
        />

        {/* Ambient Overlay for Protected Frame Headers */}
        <div className="absolute bottom-3 right-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101318]/90 backdrop-blur-md border border-[#262c37] text-[11px] text-slate-300 shadow-xl pointer-events-auto">
          <span>Live Webpage Viewport</span>
          <span className="text-[#333a49]">|</span>
          <button
            className="text-[#ff7f24] hover:text-[#ff6a00] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            onClick={handleOpenPopup}
            type="button"
          >
            <span>Open in Popup Window</span>
            <ExternalLink className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
