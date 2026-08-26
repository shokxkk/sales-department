'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Mouse tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Canvas Animation (Stars & Neural Network)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      initParticles()
    }
    window.addEventListener('resize', handleResize)

    class Particle {
      x: number; y: number; vx: number; vy: number; size: number; color: string
      constructor() {
        this.x = Math.random() * w
        this.y = Math.random() * h
        this.vx = (Math.random() - 0.5) * 0.4
        this.vy = (Math.random() - 0.5) * 0.4
        this.size = Math.random() * 1.5 + 0.5
        this.color = Math.random() > 0.3 ? 'rgba(216, 255, 56, ' : 'rgba(255, 255, 255, '
      }
      update() {
        this.x += this.vx; this.y += this.vy
        if (this.x < 0 || this.x > w) this.vx = -this.vx
        if (this.y < 0 || this.y > h) this.vy = -this.vy
      }
      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        const alpha = (Math.sin(this.x * 0.05 + this.y * 0.05) + 1) * 0.3 + 0.2
        ctx.fillStyle = this.color + alpha + ')'
        ctx.fill()
      }
    }

    const initParticles = () => {
      particles = []
      const amount = Math.floor((w * h) / 9000)
      for (let i = 0; i < amount; i++) particles.push(new Particle())
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < particles.length; i++) {
        particles[i].update()
        particles[i].draw()
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 - dist/1600})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    initParticles()
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Кириш хатоси')
        setIsLoading(false)
        return
      }

      if (data.requiresCompanySelection) {
        sessionStorage.setItem('pendingCompanies', JSON.stringify(data.companies))
        sessionStorage.setItem('pendingEmail', email)
        sessionStorage.setItem('pendingPassword', password)
        const firstCompany = data.companies[0]
        const retryRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, companyId: firstCompany.id }),
        })
        const retryData = await retryRes.json()
        if (retryData.success) {
          toast.success('Хуш келибсиз!')
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
          const from = params?.get('from') || '/dashboard'
          router.push(from.startsWith('/') ? from : '/dashboard')
        }
        return
      }

      if (data.success) {
        toast.success('Хуш келибсиз!')
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const from = params?.get('from') || '/dashboard'
        router.push(from.startsWith('/') ? from : '/dashboard')
      }
    } catch {
      toast.error('Сервер билан боғлиқ хато')
      setIsLoading(false)
    }
  }

  // Inject Custom Space Animations
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes fade-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fade-scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      @keyframes floating { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
      
      /* Planet Animations */
      @keyframes rotate-planet { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes orbit { from { transform: rotate(0deg) translateX(50px) rotate(0deg); } to { transform: rotate(360deg) translateX(50px) rotate(-360deg); } }
      
      /* Rocket & Comet Animations */
      @keyframes rocket-fly {
        0% { transform: translate(-20vw, 120vh) rotate(45deg); opacity: 0; }
        10% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translate(120vw, -20vh) rotate(45deg); opacity: 0; }
      }
      
      @keyframes comet-fall {
        0% { transform: translate(120vw, -20vh) rotate(-45deg); opacity: 0; }
        10% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translate(-20vw, 120vh) rotate(-45deg); opacity: 0; }
      }
      
      .animate-logo { animation: fade-slide-up 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .animate-card { animation: fade-scale-up 700ms cubic-bezier(0.16, 1, 0.3, 1) 200ms forwards; opacity: 0; }
      .animate-float { animation: floating 6s ease-in-out infinite; }
      
      .planet-1 {
        position: absolute; top: -10%; right: -5%; width: 400px; height: 400px;
        background: radial-gradient(circle at 30% 30%, #1a2a40 0%, #090b11 70%);
        border-radius: 50%; box-shadow: inset -20px -20px 50px rgba(0,0,0,0.8), 0 0 50px rgba(216, 255, 56, 0.05);
        animation: rotate-planet 120s linear infinite; z-index: 0; opacity: 0.6;
      }
      .planet-2 {
        position: absolute; bottom: 10%; left: -10%; width: 250px; height: 250px;
        background: radial-gradient(circle at 40% 40%, rgba(216, 255, 56, 0.1) 0%, transparent 60%);
        border-radius: 50%; box-shadow: inset -10px -10px 40px rgba(0,0,0,0.9);
        animation: rotate-planet 80s linear infinite reverse; z-index: 0;
      }
      /* Saturn Ring */
      .planet-2::after {
        content: ''; position: absolute; top: 50%; left: -20%; right: -20%; height: 20px;
        border: 2px solid rgba(216, 255, 56, 0.15); border-radius: 50%;
        transform: translateY(-50%) rotate(20deg); box-shadow: 0 0 10px rgba(216,255,56,0.1);
      }
      
      .rocket-container {
        position: absolute; z-index: 1; pointer-events: none;
        animation: rocket-fly 20s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        filter: drop-shadow(0 0 10px rgba(216,255,56,0.5));
      }
      .comet-container {
        position: absolute; z-index: 1; pointer-events: none;
        animation: comet-fall 15s linear infinite; animation-delay: 5s;
      }
      .comet-tail {
        width: 150px; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,0.8), transparent);
        box-shadow: 0 0 10px #fff; border-radius: 50%;
      }
      
      input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1a1d24 inset !important;
          -webkit-text-fill-color: white !important; transition: background-color 5000s ease-in-out 0s;
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#090B11', fontFamily: '"Inter", "SF Pro Display", sans-serif' }}
    >
      {/* --- COSMIC BACKGROUND ELEMENTS --- */}
      
      {/* Galaxy / Nebula Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-60 -right-40 w-[900px] h-[900px] rounded-full blur-[150px] opacity-20" style={{ background: 'radial-gradient(circle, #D8FF38 0%, transparent 60%)' }} />
        <div className="absolute -bottom-60 -left-40 w-[900px] h-[900px] rounded-full blur-[150px] opacity-15" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 60%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[400px] rounded-[100%] blur-[100px] opacity-5 rotate-45" style={{ background: 'radial-gradient(ellipse, #c084fc 0%, transparent 70%)' }} />
      </div>

      {/* Planets */}
      <div className="planet-1" />
      <div className="planet-2" />

      {/* Neural Network Starfield Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen"
      />

      {/* Rocket & Comet */}
      <div className="rocket-container flex items-center">
        {/* Rocket tail/flame */}
        <div className="w-20 h-1 bg-gradient-to-r from-transparent via-orange-500 to-yellow-300 blur-[2px] -mr-1 animate-pulse" />
        {/* Rocket SVG */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white drop-shadow-md transform -rotate-45">
          <path d="M12 2C12 2 4 6 4 14C4 18 5 22 5 22L9 20L12 22L15 20L19 22C19 22 20 18 20 14C20 6 12 2 12 2Z" fill="#E5E7EB"/>
          <path d="M12 2C12 2 16 6 16 14C16 18 15.5 22 15.5 22L12 20V2Z" fill="#D1D5DB"/>
          <circle cx="12" cy="11" r="2" fill="#1F2937"/>
          <path d="M4 14L1 18L5 22" fill="#D8FF38"/>
          <path d="M20 14L23 18L19 22" fill="#D8FF38"/>
          <path d="M9 20L12 24L15 20" fill="#EF4444" className="animate-pulse"/>
        </svg>
      </div>

      <div className="comet-container">
        <div className="comet-tail" />
      </div>

      {/* Mouse Interaction Glow */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(216, 255, 56, 0.08), transparent 40%)`
        }}
      />
      {/* --- END COSMIC BACKGROUND --- */}


      {/* Foreground UI */}
      <div className="relative w-full max-w-md mx-auto z-10 flex flex-col items-center">
        
        {/* Header / Logo */}
        <div className="text-center mb-10 animate-logo flex flex-col items-center w-full">
          <div className="mb-6 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl text-[10px] uppercase tracking-widest text-[#9CA3AF] font-medium inline-flex items-center gap-2 shadow-xl shadow-[#D8FF38]/5 animate-float hover:border-[#D8FF38]/30 transition-colors cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D8FF38] animate-pulse" style={{ boxShadow: '0 0 10px #D8FF38' }} />
            AI Sales Platform 2026
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white drop-shadow-2xl">
            Clario <span style={{ color: '#D8FF38', textShadow: '0 0 30px rgba(216, 255, 56, 0.5)' }}>AI</span>
          </h1>
          <p className="text-[#9CA3AF] text-[15px] sm:text-base font-medium mb-3 max-w-[280px] sm:max-w-none">
            Сотувни эмас, натижани бошқаринг.
          </p>
          <p className="text-gray-500 text-xs sm:text-sm max-w-[340px] leading-relaxed mx-auto">
            Қўнғироқларни таҳлил қилинг, менежерларни баҳоланг, CRM интизомини назорат қилинг ва сотув самарадорлигини оширинг.
          </p>
        </div>

        {/* Login Card */}
        <div 
          className="w-full rounded-[32px] p-8 animate-card shadow-2xl relative overflow-hidden backdrop-blur-2xl group/card"
          style={{ 
            backgroundColor: 'rgba(18, 21, 28, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255,255,255,0.02)'
          }}
        >
          {/* Subtle top edge lighting */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 group-hover/card:opacity-100 transition-opacity" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 relative group">
              <label htmlFor="email" className="block text-[13px] font-medium text-[#9CA3AF] group-focus-within:text-[#D8FF38] transition-colors">
                Электрон почта
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sizning@email.uz"
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D8FF38]/50 focus:border-[#D8FF38]/50 transition-all text-sm shadow-inner"
              />
            </div>

            <div className="space-y-1.5 relative group">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-[13px] font-medium text-[#9CA3AF] group-focus-within:text-[#D8FF38] transition-colors">
                  Парол
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 pr-11 rounded-2xl bg-black/40 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#D8FF38]/50 focus:border-[#D8FF38]/50 transition-all text-sm shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#D8FF38] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group/btn relative w-full py-3.5 px-4 rounded-2xl text-[#090B11] font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 overflow-hidden transition-all duration-300 transform hover:scale-[1.02]"
              style={{ 
                backgroundColor: '#D8FF38', 
                boxShadow: '0 0 25px rgba(216, 255, 56, 0.25)' 
              }}
            >
              <div className="absolute inset-0 bg-white/30 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin text-[#090B11]" /> Кириляпти...</>
                ) : (
                  'Тизимга кириш'
                )}
              </span>
            </button>
          </form>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-white/5 relative">
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-12 h-[1px] bg-gradient-to-r from-transparent via-[#D8FF38]/30 to-transparent" />
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[11.5px] text-[#9CA3AF] font-medium">
              {[
                { name: 'AI Audit' }, { name: 'CRM Nazorat' },
                { name: 'Sotuv Analitikasi' }, { name: 'AI Hisobotlar' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 group/feat cursor-default">
                  <div className="p-1 rounded-full bg-white/5 group-hover/feat:bg-[#D8FF38]/10 transition-colors">
                    <Check size={10} style={{ color: '#D8FF38' }} className="group-hover/feat:scale-110 transition-transform" />
                  </div>
                  <span className="group-hover/feat:text-gray-300 transition-colors">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Demo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 rounded-2xl bg-black/50 border border-white/5">
              <p className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest pl-1">
                Тест ҳисоблар
              </p>
              <div className="space-y-1">
                {[
                  ['admin@demo.uz', 'Admin123!', 'COMPANY_ADMIN'],
                  ['rop@demo.uz', 'Rop123!', 'SALES_DIRECTOR'],
                ].map(([e, p, role]) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setEmail(e); setPassword(p) }}
                    className="w-full text-left text-[11px] text-[#9CA3AF] hover:text-white py-2 px-3 rounded-xl hover:bg-white/5 transition-all flex justify-between items-center group/demo"
                  >
                    <span className="font-mono">{e}</span>
                    <span className="font-semibold text-[#D8FF38] opacity-60 group-hover/demo:opacity-100 transition-opacity tracking-wide text-[9px]">{role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#9CA3AF] mt-10 font-medium tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity cursor-default">
          © {new Date().getFullYear()} Clario AI
        </p>
      </div>
    </div>
  )
}
