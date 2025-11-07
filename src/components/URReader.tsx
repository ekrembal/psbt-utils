import { useState, useRef, useEffect } from 'preact/hooks'
import QrScanner from 'qr-scanner'
import { URDecoder } from 'foundation-ur-py'

export function URReader() {
  const [isScanning, setIsScanning] = useState(false)
  const [decodedData, setDecodedData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [availableCameras, setAvailableCameras] = useState<QrScanner.Camera[]>([])
  const [progress, setProgress] = useState<number>(0)
  const [partsCount, setPartsCount] = useState<number>(0)
  const [isMultiPart, setIsMultiPart] = useState<boolean>(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const urDecoderRef = useRef<URDecoder | null>(null)
  const scannedPartsRef = useRef<Set<string>>(new Set())

  // Get available cameras on component mount
  useEffect(() => {
    const getCameras = async () => {
      try {
        const cameras = await QrScanner.listCameras(true)
        setAvailableCameras(cameras)
        console.log('Available cameras:', cameras)
      } catch (err) {
        console.error('Error getting cameras:', err)
      }
    }
    getCameras()
  }, [])

  const startScanning = async () => {
    console.log('🚀 startScanning called')
    
    try {
      console.log('✅ Starting camera initialization...')
      setError(null)
      setCameraError(null)
      setDecodedData(null)
      setProgress(0)
      setPartsCount(0)
      setIsMultiPart(false)
      urDecoderRef.current = null
      scannedPartsRef.current.clear()

      // Check if QrScanner is supported
      const hasCamera = await QrScanner.hasCamera()
      if (!hasCamera) {
        console.log('❌ QrScanner.hasCamera() returned false')
        setCameraError('No camera found on this device')
        return
      }
      console.log('✅ QrScanner.hasCamera() returned true')

      console.log('Available cameras:', availableCameras)

      // Stop any existing scanner
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      }

      // Check camera permission first
      console.log('🔐 Checking camera permissions...')
      try {
        // Try environment camera first, fallback to any camera
        let stream
        try {
          console.log('📹 Trying environment camera...')
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment' // Prefer back camera
            } 
          })
          console.log('✅ Environment camera permission granted')
        } catch (envErr) {
          console.log('❌ Environment camera failed, trying any camera:', envErr)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          })
          console.log('✅ Any camera permission granted')
        }
        setHasPermission(true)
        stream.getTracks().forEach(track => track.stop()) // Stop the test stream
        console.log('✅ Camera permission check completed')
      } catch (permissionErr) {
        console.error('❌ Permission error:', permissionErr)
        setCameraError('Camera permission denied. Please allow camera access and try again.')
        setHasPermission(false)
        return
      }

      // Set scanning state first so video element is rendered
      console.log('🎬 Setting isScanning to true...')
      setIsScanning(true)
      console.log('✅ isScanning set to true')
      
      // Wait for video element to be rendered
      setTimeout(async () => {
        console.log('Video ref current after timeout:', videoRef.current)
        
        if (!videoRef.current) {
          console.log('❌ Video element still not ready after timeout')
          setCameraError('Video element not ready')
          setIsScanning(false)
          return
        }
        console.log('✅ Video element is ready')

        try {
          // Create QR scanner with better configuration
          console.log('🔧 Creating QrScanner...')
          console.log('Using camera ID:', availableCameras.length > 0 ? availableCameras[0].id : 'environment')
          
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            (result) => {
              console.log('QR Code detected:', result.data)
              handleQRResult(result.data)
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
              preferredCamera: availableCameras.length > 0 ? availableCameras[0].id : 'environment',
              maxScansPerSecond: 10, // Increased for better animated QR code support
            }
          )
          console.log('✅ QrScanner created successfully')

          console.log('🚀 Attempting to start QrScanner...')
          await qrScannerRef.current.start()
          console.log('✅ QR scanner started successfully')
        } catch (startErr) {
          console.error('❌ Error starting scanner:', startErr)
          setCameraError(`Failed to start camera: ${startErr instanceof Error ? startErr.message : 'Unknown error'}`)
          setIsScanning(false)
        }
      }, 200) // Increased timeout to ensure video element is rendered
    } catch (err) {
      console.error('❌ Camera error in startScanning:', err)
      setCameraError(`Camera error: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
    // Don't reset decoder and scanned parts here - they're needed for the results
  }

  const handleQRResult = async (qrData: string) => {
    try {
      setError(null)
      
      console.log('QR Code detected:', qrData)
      
      // Check if it's a UR format (case-insensitive)
      if (!qrData.toUpperCase().startsWith('UR:')) {
        setError('Not a valid UR format. QR code should start with "ur:"')
        return
      }
      
      // Check if we've already scanned this exact part
      if (scannedPartsRef.current.has(qrData)) {
        console.log('🔄 Already scanned this part, skipping...')
        return
      }
      
      // Add to scanned parts
      scannedPartsRef.current.add(qrData)
      console.log(`✅ New part added. Total unique parts: ${scannedPartsRef.current.size}`)
      
      // Check if this is a multi-part UR (contains sequence info like /1-10/)
      const isMultiPartUR = /\/\d+-\d+\//.test(qrData)
      setIsMultiPart(isMultiPartUR)
      
      if (isMultiPartUR) {
        // Handle multi-part UR decoding
        if (!urDecoderRef.current) {
          console.log('🔧 Initializing URDecoder...')
          urDecoderRef.current = new URDecoder()
        }
        
        try {
          await urDecoderRef.current.receivePart(qrData)
          const newPartsCount = scannedPartsRef.current.size
          setPartsCount(newPartsCount)
          
          console.log(`🔄 UR2 Part received! (${newPartsCount} parts)`)
          console.log(`🔍 Decoder state - isComplete: ${urDecoderRef.current.isComplete()}`)
          
          // Get progress from the decoder (if available)
          let estimatedProgress = 0
          try {
            if (typeof urDecoderRef.current.estimatedPercentComplete === 'function') {
              estimatedProgress = urDecoderRef.current.estimatedPercentComplete() * 100
            } else {
              // Fallback: calculate from sequence numbers
              const match = qrData.match(/\/(\d+)-(\d+)\//)
              if (match) {
                const totalParts = parseInt(match[2], 10)
                // Don't cap at 99% - let it reach 100% when decoder says it's complete
                estimatedProgress = Math.min((newPartsCount / totalParts) * 100, 100)
              }
            }
          } catch (err) {
            console.warn('⚠️ Could not get progress estimate:', err)
            // Fallback to simple calculation
            const match = qrData.match(/\/(\d+)-(\d+)\//)
            if (match) {
              const totalParts = parseInt(match[2], 10)
              estimatedProgress = Math.min((newPartsCount / totalParts) * 100, 100)
            }
          }
          
          setProgress(estimatedProgress)
          console.log(`📊 Progress: ${estimatedProgress.toFixed(1)}% (${newPartsCount} unique parts)`)
          
          if (urDecoderRef.current.isComplete()) {
            console.log('\n🎉 UR2 Decoding Complete!')
            setProgress(100)
            
            if (urDecoderRef.current.isSuccess()) {
              const result = urDecoderRef.current.resultMessage()
              console.log(`✅ Decoded UR type: ${result.type}`)
              
              if (result.type === 'crypto-psbt') {
                // Convert CBOR to hex for display
                const hexData = Array.from(result.cbor)
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join('')
                setDecodedData(`UR Type: ${result.type}\nCBOR Data (hex): ${hexData}`)
              } else {
                setDecodedData(`UR Type: ${result.type}\nCBOR Data: ${result.cbor.length} bytes`)
              }
              
              // Stop scanning after successful decode
              stopScanning()
            } else {
              const errorMsg = urDecoderRef.current.resultError()
              setError(`Decoding failed: ${errorMsg}`)
              stopScanning()
            }
          }
        } catch (err) {
          console.error('❌ Error processing UR part:', err)
          setError(`Error processing UR part: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      } else {
        // Single-part UR - just display it
        setDecodedData(qrData)
        setProgress(100)
        stopScanning()
      }
      
    } catch (err) {
      setError(`Error processing QR code: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const clearResults = () => {
    setDecodedData(null)
    setError(null)
    setProgress(0)
    setPartsCount(0)
    setIsMultiPart(false)
    urDecoderRef.current = null
    scannedPartsRef.current.clear()
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
              onClick={() => {
                console.log('🖱️ Start Camera button clicked')
                startScanning()
              }} 
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

          {availableCameras.length > 0 && (
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p class="text-blue-800 text-sm">
                Found {availableCameras.length} camera(s) available. 
                {availableCameras.map(cam => cam.label).join(', ')}
              </p>
              <p class="text-blue-600 text-xs mt-1">
                QrScanner support: {availableCameras.length > 0 ? 'Yes' : 'No'}
              </p>
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
          
          {/* Progress indicator for multi-part URs */}
          {isMultiPart && (
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-blue-900">Multi-part UR Scanning</span>
                <span class="text-sm font-semibold text-blue-700">{progress.toFixed(1)}%</span>
              </div>
              <div class="w-full bg-blue-200 rounded-full h-2.5">
                <div 
                  class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p class="text-xs text-blue-700 mt-2">
                Unique parts scanned: {partsCount}
              </p>
              <p class="text-xs text-blue-600 mt-1">
                Keep scanning until complete. Fountain codes may require more parts than the minimum.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {decodedData && (
        <div class="bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">QR Code Content</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="mb-2">
              <span class="text-sm font-medium text-gray-700">Content:</span>
            </div>
            <p class="text-sm text-gray-600 break-all font-mono bg-white p-3 rounded border">
              {decodedData}
            </p>
          </div>
          
          {decodedData.startsWith('ur:') ? (
            <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p class="text-green-800">
                ✅ Valid UR format detected! This would typically be processed further to extract the actual PSBT or other data.
              </p>
            </div>
          ) : (
            <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p class="text-yellow-800">
                ⚠️ This QR code does not contain UR format data. UR data typically starts with "ur:" prefix.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">How to use:</h3>
        <ul class="text-blue-800 space-y-1 text-sm">
          <li>• Click "Start Camera" to begin scanning</li>
          <li>• Point your camera at any QR code</li>
          <li>• The app will display the QR code content</li>
          <li>• UR format data starts with "ur:" prefix</li>
          <li>• For multi-part UR data, scan all parts in sequence</li>
        </ul>
      </div>
    </div>
  )
}
