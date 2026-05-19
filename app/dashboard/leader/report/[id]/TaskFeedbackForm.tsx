"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Save, Eye, EyeOff } from "lucide-react"

export default function TaskFeedbackForm({ itemId, initialFeedback, leaderId }: any) {
  const router = useRouter()
  const supabase = createClient()
  
  const [comment, setComment] = useState(initialFeedback?.comment || "")
  const [isVisible, setIsVisible] = useState(initialFeedback?.is_visible || false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const handleSave = async (publish: boolean) => {
    if (!comment.trim()) {
      setError("피드백 내용을 입력해주세요.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { error: upsertError } = await supabase
        .from('task_feedbacks')
        .upsert({
          id: initialFeedback?.id,
          report_item_id: itemId,
          leader_id: leaderId,
          comment: comment,
          is_visible: publish
        }, { onConflict: 'report_item_id' })

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
    <div className="mt-4 pt-4 border-t border-dashed">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
          과업별 피드백
          {isVisible ? (
            <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400 font-normal">공개됨</span>
          ) : (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400 font-normal">임시 저장</span>
          )}
        </h4>
      </div>
      
      <div className="space-y-3">
        <Textarea 
          placeholder="이 업무에 대한 피드백을 입력해주세요."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[80px] text-sm resize-y"
        />
        
        {error && <div className="text-xs text-destructive">{error}</div>}
        {success && <div className="text-xs text-green-600">저장되었습니다.</div>}

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs h-8"
            disabled={loading}
            onClick={() => handleSave(false)}
          >
            <Save className="w-3 h-3 mr-1.5" />
            임시 저장
          </Button>
          <Button 
            size="sm"
            className="text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
            disabled={loading}
            onClick={() => handleSave(true)}
          >
            <Eye className="w-3 h-3 mr-1.5" />
            공개
          </Button>
        </div>
      </div>
    </div>
  )
}
