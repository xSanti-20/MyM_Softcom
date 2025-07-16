import { useRef, useEffect, useState } from "react"
import { Pause, Play, Volume2, VolumeX, RotateCcw, RotateCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VideoCard() {
  const videoRef = useRef(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.muted = true
      video.play()
        .then(() => {
          setTimeout(() => {
            video.pause()
            video.currentTime = 0
            setIsVideoPlaying(false)
          }, 1000)
        })
        .catch(err => {
          console.warn("Autoplay bloqueado:", err)
        })
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const percent = (video.currentTime / video.duration) * 100
      setProgress(isNaN(percent) ? 0 : percent)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  }, [])

  const handleVideoToggle = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsVideoPlaying(true)
    } else {
      video.pause()
      setIsVideoPlaying(false)
    }
  }

  const handleMuteToggle = () => {
    const video = videoRef.current
    if (video) {
      video.muted = !video.muted
      setIsMuted(video.muted)
    }
  }

  const handleSeek = (direction) => {
    const video = videoRef.current
    if (!video) return

    if (direction === "forward") {
      video.currentTime = Math.min(video.currentTime + 10, video.duration)
    } else {
      video.currentTime = Math.max(video.currentTime - 10, 0)
    }
  }

  const handleProgressClick = (e) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.target.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = clickX / rect.width
    video.currentTime = percent * video.duration
  }

  const handleToggleControls = (e) => {
    // Evita que clic en botones afecte los controles
    const isButtonClick = e.target.closest("button")
    if (!isButtonClick) {
      setShowControls(prev => !prev)
    }
  }

  return (
    <div className="relative">
      <Card className="overflow-hidden shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0 relative">
          <div
            className="relative"
            onClick={handleToggleControls}
          >
            <video
              ref={videoRef}
              src="/assets/img/vista.mp4"
              className="w-full aspect-video object-cover"
              poster="/placeholder.svg?height=400&width=600"
              playsInline
              muted={isMuted}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            >
              Tu navegador no soporta la reproducción de este video.
            </video>

            {/* Barra de progreso */}
            <div
              className="absolute bottom-0 left-0 right-0 h-2 bg-gray-300 cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controles (con visibilidad manual por clic) */}
            <div
              className={
                "absolute inset-0 flex justify-center items-center gap-4 transition-opacity duration-300 " +
                (showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
              }
            >
              <Button
                variant="secondary"
                size="icon"
                onClick={() => handleSeek("backward")}
                className="bg-white/90 hover:bg-white shadow-lg"
              >
                <RotateCcw className="w-6 h-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleVideoToggle}
                className="bg-white/90 hover:bg-white shadow-lg"
              >
                {isVideoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => handleSeek("forward")}
                className="bg-white/90 hover:bg-white shadow-lg"
              >
                <RotateCw className="w-6 h-6" />
              </Button>
            </div>

            {/* Botón de volumen */}
            <Button
              variant="secondary"
              size="icon"
              onClick={handleMuteToggle}
              className={
                "absolute bottom-4 right-4 bg-white/90 hover:bg-white shadow-lg transition-opacity duration-300 " +
                (showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
              }
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
