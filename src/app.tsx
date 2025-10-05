import { useState } from 'preact/hooks'
import { PSBTEncoder } from './components/PSBTEncoder'
import { URReader } from './components/URReader'

export function App() {
  const [activeTab, setActiveTab] = useState<'psbt' | 'read'>('psbt')

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
              onClick={() => setActiveTab('psbt')}
              class={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'psbt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              PSBT to UR
            </button>
            <button
              onClick={() => setActiveTab('read')}
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
        {activeTab === 'psbt' && <PSBTEncoder />}
        {activeTab === 'read' && <URReader />}
      </main>
    </div>
  )
}
