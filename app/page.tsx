"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import QRCode from "qrcode"

interface TransformValues {
  // Hardcoded values - no longer adjustable
  useMatrix: boolean
  triangleMask: boolean
  triangleSize: number
  triangleX: number
  triangleY: number
  cropLeft: number
  cropTop: number
  cropRight: number
  cropBottom: number
  // Hardcoded gradient noise pattern settings
  noiseModuleSize: number
  whiteStopPoint: number
  blackStopPoint: number
  gradientIntensity: number
  gradientDirection: "tl-br" | "tr-bl" | "top-bottom" | "left-right" | "radial"
  // Homography matrix values (3x3) - hardcoded
  h11: number
  h12: number
  h13: number
  h21: number
  h22: number
  h23: number
  h31: number
  h32: number
  h33: number
}

export default function QRCodeGenerator() {
  const [text, setText] = useState("")
  const [debouncedText, setDebouncedText] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [generatedText, setGeneratedText] = useState("") // Track what text the current QR code represents
  const [isDark, setIsDark] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false) // Track if we've loaded initial state
  const [noiseKey, setNoiseKey] = useState(0) // Key to trigger noise re-generation
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [transform] = useState<TransformValues>({
    // Hardcoded settings
    useMatrix: true,
    triangleMask: true,
    triangleSize: 720, // Double for higher resolution
    triangleX: 800, // Double for higher resolution
    triangleY: 452, // Double for higher resolution
    cropLeft: 440, // Double for higher resolution
    cropTop: 140, // Double for higher resolution
    cropRight: 1160, // Double for higher resolution
    cropBottom: 760, // Double for higher resolution
    // Hardcoded gradient noise pattern settings
    noiseModuleSize: 50,
    whiteStopPoint: 30,
    blackStopPoint: 50,
    gradientIntensity: 75,
    gradientDirection: "tl-br",
    // Hardcoded matrix values
    h11: 0.718,
    h12: 0.0,
    h13: 0.0,
    h21: 0.0,
    h22: 1.0,
    h23: 0.0,
    h31: 0.0,
    h32: 0.291,
    h33: 1.5,
  })

  // Effect to read query parameter on mount and update state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialText = params.get("text")
    if (initialText) {
      setText(initialText)
      setDebouncedText(initialText) // Also set debounced text to trigger generation immediately
    }
    setHasInitialized(true) // Mark as initialized
  }, [])

  // Debounce text input to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(text)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [text])

  const generateQRCode = async (value: string) => {
    if (!value.trim()) {
      setQrCodeUrl("")
      setGeneratedText("")
      setIsGenerating(false)
      return
    }

    setIsGenerating(true)

    try {
      const url = await QRCode.toDataURL(value, {
        width: 1024, // Higher resolution
        margin: 0,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrCodeUrl(url)
      setGeneratedText(value) // Track what text this QR code represents
    } catch (error) {
      console.error("Error generating QR code:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate QR code only when debounced text changes
  useEffect(() => {
    generateQRCode(debouncedText)
  }, [debouncedText])

  // Update URL when debounced text changes (but only after initialization)
  useEffect(() => {
    if (!hasInitialized) return // Don't update URL until we've loaded initial state

    if (debouncedText.trim()) {
      const newUrl = `${window.location.pathname}?text=${encodeURIComponent(debouncedText.trim())}`
      window.history.replaceState({ path: newUrl }, "", newUrl)
    } else {
      // Clear query param when text is empty
      const newUrl = window.location.pathname
      window.history.replaceState({ path: newUrl }, "", newUrl)
    }
  }, [debouncedText, hasInitialized])

  // Calculate gradient position based on direction
  const calculateGradientPosition = (x: number, y: number, maxX: number, maxY: number, direction: string): number => {
    switch (direction) {
      case "tl-br": // Top-left to bottom-right
        const maxDiagonal = Math.sqrt(maxX * maxX + maxY * maxY)
        const currentDiagonal = Math.sqrt(x * x + y * y)
        return currentDiagonal / maxDiagonal

      case "tr-bl": // Top-right to bottom-left
        const maxDiagonalTR = Math.sqrt(maxX * maxX + maxY * maxY)
        const currentDiagonalTR = Math.sqrt((maxX - x) * (maxX - x) + y * y)
        return currentDiagonalTR / maxDiagonalTR

      case "top-bottom": // Top to bottom
        return y / maxY

      case "left-right": // Left to right
        return x / maxX

      case "radial": // Radial from center
        const centerX = maxX / 2
        const centerY = maxY / 2
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY)
        const currentRadius = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY))
        return Math.min(currentRadius / maxRadius, 1)

      default:
        return 0
    }
  }

  // Generate random QR-like pattern with QR code at top-left
  const createExtendedQRPattern = (qrImg: HTMLImageElement): HTMLCanvasElement => {
    const extendedCanvas = document.createElement("canvas")
    const ctx = extendedCanvas.getContext("2d")
    if (!ctx) return extendedCanvas

    // Make the extended canvas much larger to fill with pattern
    const extendedSize = 2048 // Higher resolution
    extendedCanvas.width = extendedSize
    extendedCanvas.height = extendedSize

    // Fill with background color based on dark mode
    ctx.fillStyle = isDark ? "#000000" : "#ffffff"
    ctx.fillRect(0, 0, extendedSize, extendedSize)

    // Use hardcoded module size for noise pattern
    const moduleSize = transform.noiseModuleSize

    // Calculate how many modules fit in the extended canvas
    const extendedModules = Math.floor(extendedSize / moduleSize)

    // Calculate QR code placement based on module size
    const qrModulesNeeded = Math.ceil(qrImg.width / moduleSize)
    const qrStartX = 0
    const qrStartY = 0
    const qrEndX = qrModulesNeeded
    const qrEndY = qrModulesNeeded

    // Convert stop points to 0-1 range
    const whiteStop = transform.whiteStopPoint / 100
    const blackStop = transform.blackStopPoint / 100
    const intensity = transform.gradientIntensity / 100

    // Generate gradient-based pattern for the entire extended canvas
    for (let y = 0; y < extendedModules; y++) {
      for (let x = 0; x < extendedModules; x++) {
        // Skip the area where the real QR code will be placed (top-left)
        if (x >= qrStartX && x < qrEndX && y >= qrStartY && y < qrEndY) {
          continue
        }

        // Calculate gradient position based on direction
        const gradientPosition = calculateGradientPosition(
          x,
          y,
          extendedModules,
          extendedModules,
          transform.gradientDirection,
        )

        // Calculate noise probability with corrected math
        let noiseProbability = 0.5 // Default 50% for areas outside gradient influence

        if (gradientPosition <= whiteStop) {
          // Before white stop: pure white (0% black probability when intensity is 100%)
          noiseProbability = 0.5 * (1 - intensity)
        } else if (gradientPosition >= blackStop) {
          // After black stop: pure black (100% black probability when intensity is 100%)
          noiseProbability = 0.5 + 0.5 * intensity
        } else {
          // Between stops: smooth transition from white to black
          const transitionPosition = (gradientPosition - whiteStop) / (blackStop - whiteStop)
          const minProb = 0.5 * (1 - intensity) // White end probability
          const maxProb = 0.5 + 0.5 * intensity // Black end probability
          noiseProbability = minProb + (maxProb - minProb) * transitionPosition
        }

        // Clamp probability to valid range
        noiseProbability = Math.max(0, Math.min(1, noiseProbability))

        // Generate black or white squares based on gradient probability
        const isBlack = Math.random() < noiseProbability
        // Invert colors in dark mode
        ctx.fillStyle = isDark ? (isBlack ? "#ffffff" : "#000000") : isBlack ? "#000000" : "#ffffff"
        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize)
      }
    }

    // Place the real QR code at the top-left, scaled to fit the module grid
    const qrX = qrStartX * moduleSize
    const qrY = qrStartY * moduleSize
    const qrSize = qrModulesNeeded * moduleSize

    // If in dark mode, we need to invert the QR code colors
    if (isDark) {
      // Create a temporary canvas to invert the QR code
      const tempQRCanvas = document.createElement("canvas")
      const tempQRCtx = tempQRCanvas.getContext("2d")
      if (tempQRCtx) {
        tempQRCanvas.width = qrImg.width
        tempQRCanvas.height = qrImg.height

        // Draw the original QR code
        tempQRCtx.drawImage(qrImg, 0, 0)

        // Get image data and invert colors
        const imageData = tempQRCtx.getImageData(0, 0, tempQRCanvas.width, tempQRCanvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          // Invert RGB values (keep alpha the same)
          data[i] = 255 - data[i] // Red
          data[i + 1] = 255 - data[i + 1] // Green
          data[i + 2] = 255 - data[i + 2] // Blue
          // data[i + 3] stays the same (Alpha)
        }

        tempQRCtx.putImageData(imageData, 0, 0)
        ctx.drawImage(tempQRCanvas, qrX, qrY, qrSize, qrSize)
      }
    } else {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    }

    return extendedCanvas
  }

  // Create equilateral triangle mask (remove bottom border section)
  const createTriangleMask = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a mask canvas
    const maskCanvas = document.createElement("canvas")
    const maskCtx = maskCanvas.getContext("2d")
    if (!maskCtx) return

    maskCanvas.width = canvas.width
    maskCanvas.height = canvas.height

    // Fill mask with black (hidden areas)
    maskCtx.fillStyle = "#000000"
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)

    // Create equilateral triangle window (white area)
    const centerX = transform.triangleX
    const centerY = transform.triangleY
    const size = transform.triangleSize
    const height = (size * Math.sqrt(3)) / 2

    maskCtx.fillStyle = "#ffffff"
    maskCtx.beginPath()
    // Top vertex
    maskCtx.moveTo(centerX, centerY - height / 2)
    // Bottom left vertex
    maskCtx.lineTo(centerX - size / 2, centerY + height / 2)
    // Bottom right vertex
    maskCtx.lineTo(centerX + size / 2, centerY + height / 2)
    maskCtx.closePath()
    maskCtx.fill()

    // Apply mask to canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

    for (let i = 0; i < imageData.data.length; i += 4) {
      const maskValue = maskData.data[i] // Use red channel of mask
      if (maskValue === 0) {
        // Black area in mask - make transparent
        imageData.data[i + 3] = 0 // Set alpha to 0
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Matrix inversion function
  const invertMatrix = (H: number[]) => {
    const [a, b, c, d, e, f, g, h, i] = H
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

    if (Math.abs(det) < 1e-10) return null // Matrix is not invertible

    return [
      (e * i - f * h) / det,
      (c * h - b * i) / det,
      (b * f - c * e) / det,
      (f * g - d * i) / det,
      (a * i - c * g) / det,
      (c * d - a * f) / det,
      (d * h - e * g) / det,
      (b * g - a * h) / det,
      (a * e - b * d) / det,
    ]
  }

  // Homography matrix transformation with proper coordinate mapping and cropping
  const applyHomographyTransform = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Use crop dimensions for canvas size (higher resolution)
    const cropWidth = transform.cropRight - transform.cropLeft
    const cropHeight = transform.cropBottom - transform.cropTop
    canvas.width = cropWidth
    canvas.height = cropHeight

    // Clear canvas with background color based on dark mode
    ctx.fillStyle = isDark ? "#000000" : "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    // Get homography matrix from hardcoded values
    const H = [
      transform.h11,
      transform.h12,
      transform.h13,
      transform.h21,
      transform.h22,
      transform.h23,
      transform.h31,
      transform.h32,
      transform.h33,
    ]

    // Invert the matrix for backward mapping
    const Hinv = invertMatrix(H)
    if (!Hinv) return

    // First, create the extended QR pattern
    const extendedPattern = createExtendedQRPattern(img)

    // Create a temporary canvas to draw the rotated extended pattern
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return

    // Enable high quality rendering
    tempCtx.imageSmoothingEnabled = true
    tempCtx.imageSmoothingQuality = "high"

    // Rotate the temp canvas 45 degrees
    const angle = (45 * Math.PI) / 180
    const rotatedWidth =
      Math.abs(extendedPattern.width * Math.cos(angle)) + Math.abs(extendedPattern.height * Math.sin(angle))
    const rotatedHeight =
      Math.abs(extendedPattern.width * Math.sin(angle)) + Math.abs(extendedPattern.height * Math.cos(angle))

    tempCanvas.width = rotatedWidth
    tempCanvas.height = rotatedHeight

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2)
    tempCtx.rotate(angle)
    tempCtx.translate(-extendedPattern.width / 2, -extendedPattern.height / 2)

    // Draw the extended QR pattern on temp canvas
    tempCtx.drawImage(extendedPattern, 0, 0, extendedPattern.width, extendedPattern.height)

    const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    const tempData = tempImageData.data

    // Create a full-size working canvas first (higher resolution)
    const workingCanvas = document.createElement("canvas")
    const workingCtx = workingCanvas.getContext("2d")
    if (!workingCtx) return

    workingCanvas.width = 1600 // Higher resolution
    workingCanvas.height = 1600

    // Clear working canvas with background color based on dark mode
    workingCtx.fillStyle = isDark ? "#000000" : "#ffffff"
    workingCtx.fillRect(0, 0, workingCanvas.width, workingCanvas.height)

    // Create working image data
    const workingImageData = workingCtx.createImageData(workingCanvas.width, workingCanvas.height)
    const workingData = workingImageData.data

    // Apply homography transformation to full working canvas
    for (let y = 0; y < workingCanvas.height; y++) {
      for (let x = 0; x < workingCanvas.width; x++) {
        // Normalize coordinates to [-1, 1] range
        const nx = (x / workingCanvas.width) * 2 - 1
        const ny = (y / workingCanvas.height) * 2 - 1

        // Apply inverse homography to find source coordinates
        const w = Hinv[6] * nx + Hinv[7] * ny + Hinv[8]

        if (Math.abs(w) > 1e-10) {
          const srcX = (Hinv[0] * nx + Hinv[1] * ny + Hinv[2]) / w
          const srcY = (Hinv[3] * nx + Hinv[4] * ny + Hinv[5]) / w

          // Convert back to pixel coordinates
          const pixelX = Math.round(((srcX + 1) * tempCanvas.width) / 2)
          const pixelY = Math.round(((srcY + 1) * tempCanvas.height) / 2)

          const dstIndex = (y * workingCanvas.width + x) * 4

          // Check bounds and copy pixel data
          if (pixelX >= 0 && pixelX < tempCanvas.width && pixelY >= 0 && pixelY < tempCanvas.height) {
            const srcIndex = (pixelY * tempCanvas.width + pixelX) * 4
            workingData[dstIndex] = tempData[srcIndex] // R
            workingData[dstIndex + 1] = tempData[srcIndex + 1] // G
            workingData[dstIndex + 2] = tempData[srcIndex + 2] // B
            workingData[dstIndex + 3] = 255 // A
          } else {
            // Out of bounds - fill with background color based on dark mode
            const bgColor = isDark ? 0 : 255
            workingData[dstIndex] = bgColor // R
            workingData[dstIndex + 1] = bgColor // G
            workingData[dstIndex + 2] = bgColor // B
            workingData[dstIndex + 3] = 255 // A
          }
        } else {
          // Invalid transformation - fill with background color based on dark mode
          const dstIndex = (y * workingCanvas.width + x) * 4
          const bgColor = isDark ? 0 : 255
          workingData[dstIndex] = bgColor // R
          workingData[dstIndex + 1] = bgColor // G
          workingData[dstIndex + 2] = bgColor // B
          workingData[dstIndex + 3] = 255 // A
        }
      }
    }

    workingCtx.putImageData(workingImageData, 0, 0)

    // Apply triangle mask with bottom border to working canvas
    createTriangleMask(workingCanvas)

    // Now crop from the working canvas to the final canvas
    const cropImageData = workingCtx.getImageData(transform.cropLeft, transform.cropTop, cropWidth, cropHeight)

    ctx.putImageData(cropImageData, 0, 0)
  }

  // Update canvas when QR code, dark mode, or noise key changes
  useEffect(() => {
    if (qrCodeUrl && canvasRef.current) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        applyHomographyTransform(canvasRef.current!, img)
      }
      img.src = qrCodeUrl
    }
  }, [qrCodeUrl, isDark, noiseKey])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setText(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      generateQRCode(text.trim())
    }
  }

  const downloadQRCode = () => {
    if (canvasRef.current) {
      // Download canvas content
      const link = document.createElement("a")
      link.download = "qrcel-qrcode.png"
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  const toggleDarkMode = () => {
    setIsDark(!isDark)
  }

  const regenerateNoise = () => {
    setNoiseKey((prev) => prev + 1)
  }

  // Check if current QR code matches the input text
  const isQRCodeCurrent = qrCodeUrl && generatedText === text.trim() && !isGenerating

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-black text-white" : "bg-white text-black"}`}
    >
      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Header and QR Code Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <div className="w-full max-w-2xl space-y-12">
            {/* Header */}
            {/* QR Code Display Area - Fixed Height Container */}
            <div className="flex flex-col items-center space-y-8">
              {/* Fixed height container to prevent layout shift */}
              <div className="flex items-center justify-center w-full max-w-[480px] h-[300px] sm:h-[416px]">
                {qrCodeUrl ? (
                  /* Show the QR code */
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto w-full max-w-[320px] sm:max-w-[480px]"
                    style={{
                      aspectRatio: "480/416",
                      imageRendering: "crisp-edges",
                    }}
                  />
                ) : isGenerating ? (
                  /* Spinner while generating */
                  <div
                    className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                      isDark ? "border-white" : "border-black"
                    }`}
                  ></div>
                ) : (
                  /* Centered logo when no QR code */
                  <div className="text-center">
                    <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">qrcel.vercel.app</h1>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="fixed bottom-0 left-0 right-0 p-6">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div
                className={`flex items-center rounded-lg border transition-all duration-300 ${
                  isDark
                    ? "bg-white/5 border-white/20 focus-within:border-white/40"
                    : "bg-black/5 border-black/20 focus-within:border-black/40"
                }`}
              >
                <input
                  type="text"
                  value={text}
                  onChange={handleInputChange}
                  placeholder="Enter text or URL to generate QR code..."
                  className={`flex-1 px-4 py-3 text-base bg-transparent border-none outline-none ${
                    isDark ? "text-white placeholder-white/50" : "text-black placeholder-black/50"
                  }`}
                />
                <div className="flex items-center gap-1 my-1 mx-2">
                  {/* Noise Button */}
                  <button
                    type="button"
                    onClick={regenerateNoise}
                    disabled={!qrCodeUrl}
                    className={`p-2 rounded-md transition-all duration-300 ${
                      isDark
                        ? "bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white disabled:text-white/30"
                        : "bg-black/5 hover:bg-black/10 disabled:bg-black/5 text-black disabled:text-black/30"
                    }`}
                    aria-label="Regenerate noise pattern"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>

                  {/* Dark Mode Toggle */}
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={`p-2 rounded-md transition-all duration-300 ${
                      isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-black"
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    {isDark ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Submit/Download Button */}
                  <button
                    type={isQRCodeCurrent ? "button" : "submit"}
                    onClick={isQRCodeCurrent ? downloadQRCode : undefined}
                    disabled={!text.trim() || isGenerating}
                    className={`p-2 rounded-md transition-all duration-300 ${
                      isDark
                        ? "bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white disabled:text-white/30"
                        : "bg-black/10 hover:bg-black/20 disabled:bg-black/5 text-black disabled:text-black/30"
                    }`}
                  >
                    {isGenerating ? (
                      <div
                        className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                          isDark ? "border-white" : "border-black"
                        }`}
                      ></div>
                    ) : isQRCodeCurrent ? (
                      /* Down arrow for download */
                      <svg
                        className="w-4 h-4 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    ) : (
                      /* Right arrow for submit */
                      <svg
                        className="w-4 h-4 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </form>
            <div className={`text-center text-xs mt-2 ${isDark ? "text-white/70" : "text-black/70"}`}>
              Built with{" "}
              <a href="https://v0.dev/" target="_blank" rel="noopener noreferrer" className="underline">
                v0
              </a>{" "}
              by{" "}
              <a href="https://x.com/jacobmparis" target="_blank" rel="noopener noreferrer" className="underline">
                @jacobmparis
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
