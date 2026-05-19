"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Save, Eye, EyeOff } from "lucide-react"

export default function FeedbackForm({ reportId, initialFeedback, leaderId }: any) {
  const router = useRouter()
  const supabase = createClient()
  
  const [overall, setOverall] = useState(initialFeedback?.overall_feedback || "")
  const [strengths, setStrengths] = useState(initialFeedback?.strengths || "")
  const [improvements, setImprovements] = useState(initialFeedback?.improvements || "")
  const [nextFocus, setNextFocus] = useState(initialFeedback?.next_focus || "")
  const [isVisible, setIsVisible] = useState(initialFeedback?.is_visible || false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSave = async (publish: boolean) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { error: upsertError } = await supabase
        .from('feedbacks')
        .upsert({
          id: initialFeedback?.id,
          report_id: reportId,
          leader_id: leaderId,
          overall_feedback: overall,
          strengths: strengths,
          improvements: improvements,
          next_focus: nextFocus,
          is_visible: publish
        }, { onConflict: 'report_id' })

      if (upsertError) throw upsertError

      setIsVisible(publish)
      setSuccess(true)
      router.refresh()
      
      setTimeout(() => setSuccess(false), 3000)

    } catch (err: any) {
      setError(err.message || "피드백 저장에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive text-destructive-foreground rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-600 text-white rounded-md text-sm">
            피드백이 성공적으로 저장되었습니다.
          </div>
        )}

        <div className="space-y-2">
          <Label>전체 코멘트</Label>
          <Textarea 
            placeholder="이번 주 업무 전반에 대한 코멘트를 입력해주세요."
            value={overall}
            onChange={(e) => setOverall(e.target.value)}
            className="min-h-[100px]"
          />
        </div>



        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t gap-4">
          <div className="text-sm text-muted-foreground">
            현재 상태: {isVisible ? (
              <span className="font-semibold text-primary flex items-center"><Eye className="w-4 h-4 mr-1"/> 멤버에게 공개됨</span>
            ) : (
              <span className="font-semibold flex items-center"><EyeOff className="w-4 h-4 mr-1"/> 비공개 작성 중</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={() => handleSave(false)}
            >
              <Save className="w-4 h-4 mr-2" />
              작성 중으로 저장
            </Button>
            <Button 
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
              onClick={() => handleSave(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              멤버에게 공개
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
