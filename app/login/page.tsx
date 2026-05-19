"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Eye, EyeOff, BookOpen, MessageSquare, Sprout } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const validateForm = () => {
    if (!email.trim()) {
      setError("이메일을 입력해주세요.")
      return false
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return false
    }
    if (isSignUp && !fullName.trim()) {
      setError("이름을 입력해주세요.")
      return false
    }
    return true
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        })
        
        if (signUpError) {
          setError(`회원가입 실패: ${signUpError.message}`)
          return
        }

        if (data.session) {
          await redirectBasedOnRole(data.session.user.id)
        } else {
          setSuccessMessage("이메일을 확인하여 계정을 인증해주세요.")
          setIsSignUp(false)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (signInError) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.")
          return
        }

        if (data.user) {
          await redirectBasedOnRole(data.user.id)
        }
      }
    } catch (err) {
      setError("인증 중 예기치 않은 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const redirectBasedOnRole = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !profile) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      if (profile.role === 'leader') {
        router.push('/dashboard/leader')
      } else {
        router.push('/dashboard/member')
      }
      router.refresh()
    } catch (err) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen bg-[#fcfbf9] text-slate-900 font-sans selection:bg-amber-200">
      
      {/* LEFT SIDE - Illustration & Intro */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-10 xl:p-16 relative overflow-hidden">
        {/* Softer subtle gradient divider */}
        <div className="absolute right-0 top-[15%] bottom-[15%] w-[1px] bg-gradient-to-b from-transparent via-stone-200/70 to-transparent"></div>
        
        <div className="w-full max-w-[480px] xl:max-w-[540px] mx-auto flex flex-col z-10 -mt-10">
          
          {/* Top Logo Area */}
          <div className="flex items-center gap-2 text-stone-800 font-bold text-lg mb-6">
            <div className="bg-white p-1.5 rounded-md border-[1.5px] border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]">
              <BookOpen className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
            </div>
            Weekly Report
          </div>

          {/* Illustration Area */}
          <div className="relative w-full mb-8 -ml-2 xl:-ml-4">
            <img 
              src="/illustration.png" 
              alt="할일도 풍년이다 일러스트" 
              className="w-full h-auto object-contain mix-blend-multiply pointer-events-none"
            />
          </div>

          {/* Bottom Feature Icons */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 bg-white/90 backdrop-blur-sm py-3.5 px-2 rounded-xl border border-stone-300 shadow-[2px_2px_0px_0px_rgba(28,25,23,0.8)] flex flex-col items-center text-center transition-transform hover:-translate-y-1">
              <div className="text-amber-500 mb-1.5 relative">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </div>
              <h3 className="font-bold text-stone-900 text-xs">업무 정리</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">한눈에 보기</p>
            </div>
            
            <div className="flex-1 bg-white/90 backdrop-blur-sm py-3.5 px-2 rounded-xl border border-stone-300 shadow-[2px_2px_0px_0px_rgba(28,25,23,0.8)] flex flex-col items-center text-center transition-transform hover:-translate-y-1">
              <div className="text-amber-500 mb-1.5">
                <MessageSquare className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-stone-900 text-xs">피드백</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">더 빠르게</p>
            </div>
            
            <div className="flex-1 bg-white/90 backdrop-blur-sm py-3.5 px-2 rounded-xl border border-stone-300 shadow-[2px_2px_0px_0px_rgba(28,25,23,0.8)] flex flex-col items-center text-center transition-transform hover:-translate-y-1">
              <div className="text-amber-500 mb-1.5">
                <Sprout className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-stone-900 text-xs">성장 기록</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">차곡차곡</p>
            </div>
          </div>

        </div>
        
        {/* Decorative background blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[0%] left-[-10%] w-96 h-96 bg-orange-50/40 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-start lg:pl-10 xl:pl-16 p-6 sm:p-12 relative lg:-mt-4">
        <div className="w-full max-w-[440px] xl:max-w-[480px]">
          
          {/* Header Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 text-stone-800 font-bold text-lg mb-10 justify-center">
            <div className="bg-white p-1.5 rounded-md border-2 border-stone-800 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]">
              <BookOpen className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
            </div>
            Weekly Report
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl p-8 sm:p-10 border border-stone-100">
            
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 break-keep inline-flex items-baseline gap-1">
                {isSignUp ? "환영합니다!" : "다시 만나서 반가워요!"} <span className="inline-block relative top-[2px]">👋</span>
              </h2>
              <p className="text-stone-500 mt-2 text-sm sm:text-base font-medium">
                {isSignUp 
                  ? "계정을 생성하여 주간 업무를 기록해보세요." 
                  : "계정에 로그인하여 주간 보고서를 확인하세요."}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 font-medium">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-3 text-sm text-green-700 bg-green-50 rounded-xl border border-green-100 font-medium">
                  {successMessage}
                </div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-stone-700 font-bold text-sm">이름</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      placeholder="이름을 입력하세요"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 rounded-xl border-stone-200 bg-stone-50/50 px-4 placeholder:text-stone-400 focus-visible:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-stone-700 font-bold text-sm">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-stone-200 bg-stone-50/50 pl-11 px-4 placeholder:text-stone-400 focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-stone-700 font-bold text-sm">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-stone-200 bg-stone-50/50 pl-11 pr-11 placeholder:text-stone-400 focus-visible:ring-amber-500"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isSignUp && (
                  <p className="text-xs text-stone-500 font-medium pt-1">
                    비밀번호는 6자 이상 입력해야 합니다.
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 mt-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-base transition-colors"
              >
                {loading ? "처리 중..." : isSignUp ? "회원가입" : "로그인"}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm font-medium text-stone-500">
              {isSignUp ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className="text-stone-900 font-bold underline underline-offset-4 decoration-2 decoration-amber-200 hover:decoration-amber-400 transition-colors ml-1"
              >
                {isSignUp ? "로그인" : "회원가입"}
              </button>
            </div>
            
          </div>
          
          {/* Footer Security Notice */}
          <div className="mt-12 text-center flex items-center justify-center gap-1.5 text-stone-500 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            모든 데이터는 안전하게 암호화되어 보호됩니다. <span className="text-amber-500 ml-0.5">💛</span>
          </div>
        </div>
      </div>
      
    </div>
  )
}
