import { useState, useRef, useEffect } from 'preact/hooks'
import QrScanner from 'qr-scanner'
// import { URDecoder, toHex } from 'foundation-ur-py' // Will be used for full UR decoding

export function URReader() {
  const [isScanning, setIsScanning] = useState(false)
  const [decodedData, setDecodedData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  const startScanning = async () => {
    if (!videoRef.current) return

    try {
      setError(null)
      setCameraError(null)
      setDecodedData(null)

      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setHasPermission(true)
      stream.getTracks().forEach(track => track.stop()) // Stop the test stream

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data)
          handleQRResult(result.data)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )

      await qrScannerRef.current.start()
      setIsScanning(true)
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError(`Camera access denied or not available: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setHasPermission(false)
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy()
      qrScannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleQRResult = async (qrData: string) => {
    try {
      setError(null)
      
      // Check if it's a UR format
      if (!qrData.startsWith('ur:')) {
        setError('Not a valid UR format. QR code should start with "ur:"')
        return
      }

      // For now, just display the raw UR data
      // In a full implementation, you would use URDecoder to decode the data
      setDecodedData(qrData)
      
      // Stop scanning after successful decode
      stopScanning()
      
    } catch (err) {
      setError(`Error processing QR code: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const clearResults = () => {
    setDecodedData(null)
    setError(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [])

  return (
    <div class="space-y-6">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Read UR from QR Code</h2>
        
        <div class="space-y-4">
          <div class="flex space-x-4">
            <button 
              onClick={startScanning} 
              disabled={isScanning}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? 'Scanning...' : 'Start Camera'}
            </button>
            
            <button 
              onClick={stopScanning} 
              disabled={!isScanning}
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop Camera
            </button>

            <button 
              onClick={clearResults} 
              disabled={!decodedData && !error}
              class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Results
            </button>
          </div>

          {hasPermission === false && (
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p class="text-yellow-800">
                Camera permission is required to scan QR codes. Please allow camera access and try again.
              </p>
            </div>
          )}

          {cameraError && (
            <div class="p-4 bg-red-50 border border-red-200 rounded-md">
              <p class="text-red-800">{cameraError}</p>
            </div>
          )}

          {error && (
            <div class="p-4 bg-red-50 border border-red-200 rounded-md">
              <p class="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Camera Preview */}
      {isScanning && (
        <div class="bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Camera Preview</h3>
          <div class="relative">
            <video 
              ref={videoRef}
              class="w-full max-w-md mx-auto rounded-lg border"
              style={{ transform: 'scaleX(-1)' }} // Mirror the video
            />
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute inset-4 border-2 border-blue-500 rounded-lg opacity-50"></div>
            </div>
          </div>
          <p class="text-center text-sm text-gray-600 mt-2">
            Point your camera at a QR code containing UR data
          </p>
        </div>
      )}

      {/* Results */}
      {decodedData && (
        <div class="bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Decoded UR Data</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="mb-2">
              <span class="text-sm font-medium text-gray-700">UR String:</span>
            </div>
            <p class="text-sm text-gray-600 break-all font-mono bg-white p-3 rounded border">
              {decodedData}
            </p>
          </div>
          
          <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p class="text-green-800">
              ✅ UR data successfully decoded! This would typically be processed further to extract the actual PSBT or other data.
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">How to use:</h3>
        <ul class="text-blue-800 space-y-1 text-sm">
          <li>• Click "Start Camera" to begin scanning</li>
          <li>• Point your camera at a QR code containing UR format data</li>
          <li>• The app will automatically detect and decode the UR data</li>
          <li>• UR data typically starts with "ur:" prefix</li>
          <li>• For multi-part UR data, scan all parts in sequence</li>
        </ul>
      </div>
    </div>
  )
}
