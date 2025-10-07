import { useState, useEffect } from 'preact/hooks'
import QRCode from 'qrcode'
import { UR, UREncoder, createPSBT, toHex } from 'foundation-ur-py'
import { Psbt } from 'bitcoinjs-lib'
import { createHash } from 'crypto'

export function PSBTEncoder() {
  const [psbtInput, setPsbtInput] = useState('')
  const [encodedParts, setEncodedParts] = useState<string[]>([])
  const [qrCodes, setQrCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentQrIndex, setCurrentQrIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1000) // milliseconds
  const [maxFragmentLen, setMaxFragmentLen] = useState(30)
  const [decodedPsbt, setDecodedPsbt] = useState<any>(null)

  // Load PSBT from URL parameters on component mount
  useEffect(() => {
    const url = new URL(window.location.href)
    const psbtFromUrl = url.searchParams.get('psbt')
    if (psbtFromUrl) {
      setPsbtInput(psbtFromUrl)
      // Auto-encode if PSBT is provided in URL
      setTimeout(() => {
        autoEncodePSBT(psbtFromUrl)
      }, 100)
    }
  }, [])

  // Auto-encode function for URL-loaded PSBT
  const autoEncodePSBT = async (psbtData: string) => {
    if (!psbtData.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Validate Base64 string
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(psbtData)) {
        throw new Error('Invalid Base64 string - must contain only A-Z, a-z, 0-9, +, /, and = characters')
      }

      // Convert Base64 string to bytes
      const psbtBytes = new Uint8Array(atob(psbtData).split('').map(char => char.charCodeAt(0)))
      
      console.log(`✅ Parsed PSBT: ${psbtBytes.length} bytes`)
      console.log(`✅ PSBT: ${toHex(psbtBytes)}`)

      // Create PSBT CBOR encoding using the new PSBT class
      const psbtCbor = createPsbtCbor(psbtBytes)
      console.log(`✅ UR_PSBT: ${toHex(psbtCbor)}`)

      // Create UR object with crypto-psbt type using the CBOR-encoded PSBT
      const psbtUr = new UR("crypto-psbt", psbtCbor)

      // Encode as multi-part UR with configurable max_fragment_len
      const encoder = new UREncoder(psbtUr, maxFragmentLen, 0, 10)

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

      // Update URL with the encoded PSBT
      const url = new URL(window.location.href)
      url.searchParams.set('tool', 'psbt-to-ur')
      url.searchParams.set('psbt', psbtData)
      window.history.replaceState({}, '', url.toString())

      // Decode the PSBT for display
      decodePSBT(psbtData)
    } catch (err) {
      setError(`Error encoding PSBT: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to create PSBT CBOR encoding using the new PSBT class
  const createPsbtCbor = (psbtBytes: Uint8Array) => {
    // Create PSBT object and get CBOR encoding
    const urPsbt = createPSBT(psbtBytes)
    return urPsbt.toCbor()
  }

  // Function to decode and display PSBT data
  const decodePSBT = (psbtBase64: string) => {
    try {
      const psbt = Psbt.fromBase64(psbtBase64)
      
      // Calculate PSBT hash (SHA256 of the PSBT string)
      const psbtHash = createHash('sha256').update(psbtBase64).digest('hex')
      
      const psbtData = {
        version: psbt.version,
        locktime: psbt.locktime,
        inputCount: psbt.inputCount,
        psbtHash: psbtHash,
        raw: psbtBase64,
        inputs: psbt.txInputs.map((input, index) => ({
          inputIndex: index,
          txid: input.hash.toString('hex'),
          vout: input.index,
          sequence: input.sequence,
          type: psbt.getInputType(index),
        })),
        outputs: psbt.txOutputs.map((output, index) => ({
          index,
          value: output.value,
          script: output.script.toString('hex'),
        })),
      }
      
      setDecodedPsbt(psbtData)
      console.log('Decoded PSBT:', psbtData)
    } catch (err) {
      console.error('Error decoding PSBT:', err)
      setError(`Error decoding PSBT: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
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

      // Encode as multi-part UR with configurable max_fragment_len
      const encoder = new UREncoder(psbtUr, maxFragmentLen, 0, 10)

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

      // Update URL with the encoded PSBT
      const url = new URL(window.location.href)
      url.searchParams.set('tool', 'psbt-to-ur')
      url.searchParams.set('psbt', psbtInput)
      window.history.replaceState({}, '', url.toString())

      // Decode the PSBT for display
      decodePSBT(psbtInput)
    } catch (err) {
      setError(`Error encoding PSBT: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }


  // Auto-animate QR codes
  useEffect(() => {
    if (qrCodes.length > 1 && isAnimating) {
      const interval = setInterval(() => {
        setCurrentQrIndex((prev) => (prev + 1) % qrCodes.length)
      }, animationSpeed) // Use configurable animation speed

      return () => clearInterval(interval)
    }
  }, [qrCodes.length, isAnimating, animationSpeed])

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

          <div>
            <label htmlFor="maxFragmentLen" class="block text-sm font-medium text-gray-700 mb-2">
              Max Fragment Length:
            </label>
            <input
              id="maxFragmentLen"
              type="number"
              value={maxFragmentLen}
              onInput={(e) => setMaxFragmentLen(parseInt((e.target as HTMLInputElement).value) || 30)}
              min="10"
              max="100"
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
          </div>
        </div>

        {error && (
          <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p class="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* PSBT Decoded Data Display */}
      {decodedPsbt && (
        <div class="bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">PSBT Details</h3>
          
          {/* Transaction Info */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-medium text-blue-900 mb-2">Transaction Info</h4>
              <div class="space-y-1 text-sm">
                <div><span class="font-medium">Version:</span> {decodedPsbt.version}</div>
                <div><span class="font-medium">Locktime:</span> {decodedPsbt.locktime}</div>
                <div><span class="font-medium">Inputs:</span> {decodedPsbt.inputCount}</div>
                <div><span class="font-medium">Outputs:</span> {decodedPsbt.outputs.length}</div>
              </div>
            </div>
            
            <div class="bg-purple-50 p-4 rounded-lg">
              <h4 class="font-medium text-purple-900 mb-2">Raw Data</h4>
              <div class="text-xs font-mono break-all text-gray-600">
                {decodedPsbt.raw.substring(0, 50)}...
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div class="mb-6">
            <h4 class="font-medium text-gray-900 mb-3">Inputs ({decodedPsbt.inputs.length})</h4>
            <div class="space-y-3">
              {decodedPsbt.inputs.map((input: any, index: number) => (
                <div key={index} class="bg-gray-50 p-4 rounded-lg border">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Transaction ID (TXID)</div>
                      <div class="text-xs font-mono text-gray-600 break-all">{input.txid}</div>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Output Index (VOUT)</div>
                      <div class="text-sm text-gray-600">{input.vout}</div>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Sequence</div>
                      <div class="text-sm text-gray-600">{input.sequence}</div>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Type</div>
                      <div class="text-sm text-gray-600">{input.type || 'Unknown'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div>
            <h4 class="font-medium text-gray-900 mb-3">Outputs ({decodedPsbt.outputs.length})</h4>
            <div class="space-y-3">
              {decodedPsbt.outputs.map((output: any, index: number) => (
                <div key={index} class="bg-gray-50 p-4 rounded-lg border">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Amount</div>
                      <div class="text-sm text-gray-600 font-mono">{(output.value / 100000000).toFixed(8)} BTC</div>
                      <div class="text-xs text-gray-500">{output.value.toLocaleString()} sats</div>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-700 mb-1">Output Script</div>
                      <div class="text-xs font-mono text-gray-600 break-all">{output.script}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {encodedParts.length > 0 && (
        <div class="bg-white shadow rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">
              Encoded Parts ({encodedParts.length})
            </h3>
            {qrCodes.length > 1 && (
              <div class="space-y-3">
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
                <div class="w-64">
                  <label htmlFor="animationSpeedSlider" class="block text-sm font-medium text-gray-700 mb-2">
                    Animation Speed: {animationSpeed}ms
                  </label>
                  <input
                    id="animationSpeedSlider"
                    type="range"
                    min="100"
                    max="1000"
                    step="25"
                    value={animationSpeed}
                    onInput={(e) => setAnimationSpeed(parseInt((e.target as HTMLInputElement).value))}
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
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
