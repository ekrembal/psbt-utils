import { useState, useEffect } from 'preact/hooks'
import { PSBTEncoder } from './components/PSBTEncoder'
import { URReader } from './components/URReader'

export function App() {
  const [activeTab, setActiveTab] = useState<'psbt' | 'read'>('psbt')

  // Initialize from URL parameters on component mount
  useEffect(() => {
    const url = new URL(window.location.href)
    const tool = url.searchParams.get('tool')
    
    if (tool === 'read-ur') {
      setActiveTab('read')
    } else if (tool === 'psbt-to-ur') {
      setActiveTab('psbt')
    }
    // If no tool parameter, keep default 'psbt'
  }, [])

  // Handle URL updates when switching tools
  const handleTabChange = (tab: 'psbt' | 'read') => {
    setActiveTab(tab)
    
    const url = new URL(window.location.href)
    if (tab === 'read') {
      // Remove PSBT parameter when switching to read-ur tool
      url.searchParams.delete('psbt')
      url.searchParams.set('tool', 'read-ur')
    } else {
      url.searchParams.set('tool', 'psbt-to-ur')
    }
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="py-6">
            <h1 class="text-3xl font-bold text-gray-900">PSBT Utils</h1>
            <p class="mt-2 text-gray-600">Bitcoin PSBT encoding and decoding with UR format</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex space-x-8">
            <button
              onClick={() => handleTabChange('psbt')}
              class={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'psbt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              PSBT to UR
            </button>
            <button
              onClick={() => handleTabChange('read')}
              class={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'read'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Read UR
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Keep both mounted to preserve state, just hide the inactive one */}
        <div style={{ display: activeTab === 'psbt' ? 'block' : 'none' }}>
          <PSBTEncoder />
        </div>
        <div style={{ display: activeTab === 'read' ? 'block' : 'none' }}>
          <URReader />
        </div>
      </main>
    </div>
  )
}
