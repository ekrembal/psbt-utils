import { useState, useEffect } from 'preact/hooks'
import QRCode from 'qrcode'
import { UR, UREncoder, URDecoder, createPSBT, toHex } from 'foundation-ur-py'

export function PSBTEncoder() {
  const [psbtInput, setPsbtInput] = useState('')
  const [encodedParts, setEncodedParts] = useState<string[]>([])
  const [qrCodes, setQrCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQrIndex, setCurrentQrIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Helper function to create PSBT CBOR encoding using the new PSBT class
  const createPsbtCbor = (psbtBytes: Uint8Array) => {
    // Create PSBT object and get CBOR encoding
    const urPsbt = createPSBT(psbtBytes)
    return urPsbt.toCbor()
  }

  const encodePSBT = async () => {
    if (!psbtInput.trim()) {
      setError('Please enter a PSBT Base64 string')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Validate Base64 string
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(psbtInput)) {
        throw new Error('Invalid Base64 string - must contain only A-Z, a-z, 0-9, +, /, and = characters')
      }

      // Convert Base64 string to bytes
      const psbtBytes = new Uint8Array(atob(psbtInput).split('').map(char => char.charCodeAt(0)))
      
      console.log(`✅ Parsed PSBT: ${psbtBytes.length} bytes`)
      console.log(`✅ PSBT: ${toHex(psbtBytes)}`)

      // Create PSBT CBOR encoding using the new PSBT class
      const psbtCbor = createPsbtCbor(psbtBytes)
      console.log(`✅ UR_PSBT: ${toHex(psbtCbor)}`)

      // Create UR object with crypto-psbt type using the CBOR-encoded PSBT
      const psbtUr = new UR("crypto-psbt", psbtCbor)

      // Encode as multi-part UR with same parameters as test_psbt.js (max_fragment_len=30, min_fragment_len=10)
      const encoder = new UREncoder(psbtUr, 30, 0, 10)

      console.log(`✅ Created UR2 encoder: ${encoder.fountainEncoder.seqLen()} parts`)
      
      const parts: string[] = []
      // Display all parts (same approach as test_psbt.js)
      for (let i = 0; i < encoder.fountainEncoder.seqLen(); i++) {
        const part = await encoder.nextPart()
        parts.push(part)
        console.log(`   Part ${i+1}: ${part}`)
      }

      setEncodedParts(parts)

      // Generate QR codes for all parts
      const qrDataUrls: string[] = []
      for (const part of parts) {
        try {
          const qrDataURL = await QRCode.toDataURL(part, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          qrDataUrls.push(qrDataURL)
        } catch (err) {
          console.error('Error generating QR code:', err)
        }
      }

      setQrCodes(qrDataUrls)
      setCurrentQrIndex(0)
    } catch (err) {
      setError(`Error encoding PSBT: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const decodePSBT = async () => {
    if (encodedParts.length === 0) {
      setError('No encoded parts to decode')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const decoder = new URDecoder()

      // Process each part
      for (const part of encodedParts) {
        await decoder.receivePart(part)
        if (decoder.isComplete()) {
          break
        }
      }

      if (decoder.isSuccess()) {
        const decodedUr = decoder.resultMessage()
        
        // The decoded UR contains the CBOR-encoded PSBT data
        const psbtCbor = decodedUr.cbor
        console.log(`✅ Decoded UR_PSBT: ${toHex(psbtCbor)}`)
        
        // Convert CBOR back to PSBT bytes (the CBOR contains the raw PSBT data)
        const psbtData = psbtCbor
        const decodedBase64 = btoa(String.fromCharCode(...psbtData))
        
        console.log('✅ Decoded PSBT:', decodedBase64)
        console.log(`✅ PSBT: ${toHex(psbtData)}`)
        alert(`PSBT decoded successfully! Length: ${psbtData.length} bytes`)
      } else {
        throw new Error(`Decode failed: ${decoder.resultError()}`)
      }
    } catch (err) {
      setError(`Error decoding PSBT: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-animate QR codes
  useEffect(() => {
    if (qrCodes.length > 1 && isAnimating) {
      const interval = setInterval(() => {
        setCurrentQrIndex((prev) => (prev + 1) % qrCodes.length)
      }, 1000) // Change QR code every second

      return () => clearInterval(interval)
    }
  }, [qrCodes.length, isAnimating])

  const startAnimation = () => {
    if (qrCodes.length > 1) {
      setIsAnimating(true)
    }
  }

  const stopAnimation = () => {
    setIsAnimating(false)
  }

  return (
    <div class="space-y-6">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">PSBT to UR Encoder</h2>
        
        <div class="space-y-4">
          <div>
            <label htmlFor="psbtInput" class="block text-sm font-medium text-gray-700 mb-2">
              PSBT Base64 String:
            </label>
            <textarea
              id="psbtInput"
              value={psbtInput}
              onInput={(e) => setPsbtInput((e.target as HTMLTextAreaElement).value)}
              placeholder="Enter PSBT Base64 string"
              rows={4}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="flex space-x-4">
            <button 
              onClick={encodePSBT} 
              disabled={loading}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Encode PSBT'}
            </button>
            
            <button 
              onClick={decodePSBT} 
              disabled={loading || encodedParts.length === 0}
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Decode PSBT
            </button>
          </div>
        </div>

        {error && (
          <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p class="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {encodedParts.length > 0 && (
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">
              Encoded Parts ({encodedParts.length})
            </h3>
            {qrCodes.length > 1 && (
              <div class="flex space-x-2">
                <button
                  onClick={startAnimation}
                  disabled={isAnimating}
                  class="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Start Animation
                </button>
                <button
                  onClick={stopAnimation}
                  disabled={!isAnimating}
                  class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  Stop Animation
                </button>
              </div>
            )}
          </div>

          {/* QR Code Display */}
          {qrCodes.length > 0 && (
            <div class="flex justify-center mb-6">
              <div class="text-center">
                <div class="bg-white p-4 rounded-lg shadow-lg inline-block">
                  <img 
                    src={qrCodes[currentQrIndex]} 
                    alt={`QR Code Part ${currentQrIndex + 1}`}
                    class="mx-auto"
                  />
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  Part {currentQrIndex + 1} of {qrCodes.length}
                </p>
              </div>
            </div>
          )}

          {/* Parts List */}
          <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {encodedParts.map((part, i) => (
              <div key={i} class="mb-3 p-3 bg-white rounded border">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-sm text-gray-700">Part {i + 1}</span>
                  <button
                    onClick={() => setCurrentQrIndex(i)}
                    class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                  >
                    Show QR
                  </button>
                </div>
                <p class="text-xs text-gray-600 break-all font-mono">{part}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
