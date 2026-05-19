"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PlusCircle, Trash2, Save, Send, AlertCircle } from "lucide-react"

type ReportItem = {
  id?: string
  category: string
  title: string
  description: string
  status: string
  progress: number
  issues: string
  related_link?: string
  requires_leader_review?: boolean
  review_request_note?: string
}

const CATEGORIES = ['Completed This Week', 'Next Week Plan', 'Assigned Tasks']
const STATUSES = ['Planned', 'In Progress', 'Completed', 'On Hold', 'Delayed']

const CATEGORY_MAP: Record<string, string> = {
  'Completed This Week': '이번 주 완료 업무',
  'Next Week Plan': '다음 주 예정 업무',
  'Assigned Tasks': '수명 업무'
}

const STATUS_MAP: Record<string, string> = {
  'Planned': '예정',
  'In Progress': '진행 중',
  'Completed': '완료',
  'On Hold': '보류',
  'Delayed': '지연'
}

interface ReportEditorProps {
  weekStartDate: string;
  initialReport: any;
  initialItems: ReportItem[];
  feedback: any;
  taskFeedbacks?: any[];
}

export default function ReportEditor({ weekStartDate, initialReport, initialItems, feedback, taskFeedbacks = [] }: ReportEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [items, setItems] = useState<ReportItem[]>(initialItems || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)

  const addItem = () => {
    setItems([
      ...items,
      {
        category: 'Completed This Week',
        title: '',
        description: '',
        status: 'Planned',
        progress: 0,
        issues: '',
        support_requested: '',
        related_link: '',
        requires_leader_review: false,
        review_request_note: ''
      }
    ])
  }

  const updateItem = (index: number, field: keyof ReportItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const confirmDelete = (index: number) => {
    setItemToDelete(index)
  }

  const deleteItem = async () => {
    if (itemToDelete === null) return
    const item = items[itemToDelete]
    
    // If it has an ID, it means it's in the DB, so we should delete it from DB immediately or mark it
    // Actually, simpler to just delete it from DB right now if it exists
    if (item.id) {
      setLoading(true)
      const { error } = await supabase.from('report_items').delete().eq('id', item.id)
      setLoading(false)
      if (error) {
        setError("데이터베이스에서 항목을 삭제하지 못했습니다.")
        setItemToDelete(null)
        return
      }
    }
    
    const newItems = items.filter((_, i) => i !== itemToDelete)
    setItems(newItems)
    setItemToDelete(null)
  }

  const saveReport = async (status: 'draft' | 'submitted') => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Upsert Report
      let reportId = initialReport?.id
      
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .upsert({
          id: reportId, // will be undefined for new reports, letting Postgres generate UUID
          user_id: user.id,
          week_start_date: weekStartDate,
          status: status
        }, { onConflict: 'user_id,week_start_date' })
        .select()
        .single()
        
      if (reportError) throw reportError
      reportId = reportData.id

      // 2. Upsert Items
      for (const item of items) {
        // basic validation
        if (!item.title.trim()) continue; // skip empty titles

        const { error: itemError } = await supabase
          .from('report_items')
          .upsert({
            id: item.id, // if undefined, it creates new
            report_id: reportId,
            category: item.category,
            title: item.title,
            description: item.description,
            status: item.status,
            progress: item.progress,
            issues: item.issues,
            support_requested: item.support_requested,
            related_link: item.related_link,
            requires_leader_review: item.requires_leader_review || false,
            review_request_note: item.review_request_note || ''
          })

        if (itemError) throw itemError
      }

      router.push('/dashboard/member')
      router.refresh()

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {error && (
        <div className="p-4 bg-destructive text-destructive-foreground rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>항목을 삭제하시겠습니까?</CardTitle>
              <CardDescription>이 작업은 되돌릴 수 없습니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setItemToDelete(null)} disabled={loading}>취소</Button>
              <Button variant="destructive" onClick={deleteItem} disabled={loading}>삭제</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Feedback Section */}
      {feedback && feedback.overall_feedback && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              전체 코멘트
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{feedback.overall_feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-6">
        {items.map((item, index) => (
          <Card key={index} className="relative overflow-visible">
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute -top-3 -right-3 rounded-full w-8 h-8 shadow-sm"
              onClick={() => confirmDelete(index)}
              title="업무 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Category & Status */}
                <div className="md:col-span-3 space-y-4">
                  <div className="space-y-2">
                    <Label>구분</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={item.category}
                      onChange={(e) => updateItem(index, 'category', e.target.value)}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_MAP[c] || c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>상태</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={item.status}
                      onChange={(e) => updateItem(index, 'status', e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s] || s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>진행률: {item.progress}%</Label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      className="w-full accent-primary"
                      value={item.progress}
                      onChange={(e) => updateItem(index, 'progress', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="md:col-span-9 space-y-4">
                  <div className="space-y-2">
                    <Label>업무명 *</Label>
                    <Input 
                      placeholder="예: 신규 랜딩 페이지 디자인" 
                      value={item.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>상세 내용</Label>
                    <Textarea 
                      placeholder="진행했거나 진행할 업무 내용을 간단히 작성해주세요..." 
                      className="h-20"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>관련 링크</Label>
                    <Input 
                      placeholder="Google Docs, Notion, Figma, PPT 링크 등을 입력해주세요." 
                      value={item.related_link || ''}
                      onChange={(e) => updateItem(index, 'related_link', e.target.value)}
                    />
                  </div>
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`review-${index}`}
                        className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                        checked={item.requires_leader_review || false}
                        onChange={(e) => updateItem(index, 'requires_leader_review', e.target.checked)}
                      />
                      <Label htmlFor={`review-${index}`} className="font-semibold cursor-pointer">
                        리더 필수 검토 요청
                      </Label>
                    </div>
                    {item.requires_leader_review && (
                      <div className="space-y-2 pl-6">
                        <Label>검토 요청 내용</Label>
                        <Textarea 
                          placeholder="어떤 부분에 대해 리더의 검토가 필요한지 구체적으로 작성해주세요." 
                          className="h-20"
                          value={item.review_request_note || ''}
                          onChange={(e) => updateItem(index, 'review_request_note', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>애로사항</Label>
                      <Textarea 
                        placeholder="진행상 문제점이 있나요?" 
                        className="h-16"
                        value={item.issues}
                        onChange={(e) => updateItem(index, 'issues', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>지원 요청사항</Label>
                      <Textarea 
                        placeholder="어떤 도움이 필요하신가요?" 
                        className="h-16"
                        value={item.support_requested}
                        onChange={(e) => updateItem(index, 'support_requested', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Task-Level Feedback */}
                  {item.id && taskFeedbacks.find(tf => tf.report_item_id === item.id) && (
                    <div className="mt-6 pt-4 border-t border-dashed">
                      <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                        <h4 className="font-semibold text-sm text-primary flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          리더 피드백
                        </h4>
                        <p className="text-sm whitespace-pre-wrap text-foreground/90">
                          {taskFeedbacks.find(tf => tf.report_item_id === item.id)?.comment}
                        </p>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
            아직 추가된 업무가 없습니다. 아래 버튼을 눌러 추가해주세요.
          </div>
        )}

        <Button variant="outline" className="w-full border-dashed" onClick={addItem}>
          <PlusCircle className="w-4 h-4 mr-2" />
          업무 추가
        </Button>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex justify-center z-40">
        <div className="w-full max-w-5xl flex items-center justify-between">
          <p className="text-sm text-muted-foreground hidden md:block">
            {initialReport?.status === 'submitted' 
              ? "현재 제출 완료 상태입니다. 다시 저장하면 업데이트됩니다."
              : "현재 작성 중 상태입니다. 아직 리더에게 표시되지 않습니다."}
          </p>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button 
              variant="secondary" 
              className="flex-1 md:flex-none" 
              disabled={loading}
              onClick={() => saveReport('draft')}
            >
              <Save className="w-4 h-4 mr-2" />
              작성 중으로 저장
            </Button>
            <Button 
              className="flex-1 md:flex-none"
              disabled={loading}
              onClick={() => saveReport('submitted')}
            >
              <Send className="w-4 h-4 mr-2" />
              보고서 제출
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
