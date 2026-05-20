export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { format } from "date-fns"
import FeedbackForm from "./FeedbackForm"
import TaskFeedbackForm from "./TaskFeedbackForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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

const STATUS_COLORS: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50',
  'Delayed': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50',
  'On Hold': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
  'Planned': 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50'
}

export default async function LeaderReportView({ 
  params,
  searchParams
}: { 
  params: { id: string },
  searchParams: { review_only?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch report details
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*, profiles(full_name, email)')
    .eq('id', params.id)
    .single()

  if (reportError || !report) {
    notFound()
  }

  // Fetch report items
  let itemsQuery = supabase
    .from('report_items')
    .select('*')
    .eq('report_id', report.id)
    .order('created_at', { ascending: true })

  if (searchParams.review_only === 'true') {
    itemsQuery = itemsQuery.eq('requires_leader_review', true)
  }

  const { data: items } = await itemsQuery

  // Fetch task-level feedbacks
  let taskFeedbacks: any[] = []
  if (items && items.length > 0) {
    const itemIds = items.map(i => i.id)
    const { data: tf } = await supabase
      .from('task_feedbacks')
      .select('*')
      .in('report_item_id', itemIds)
    taskFeedbacks = tf || []
  }

  // Fetch existing feedback
  const { data: feedback } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('report_id', report.id)
    .single()

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/leader">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {report.profiles?.full_name}의 보고서
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(report.week_start_date), 'yyyy년 M월 d일')} 주간
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
          <h2 className="text-xl font-semibold">제출된 업무 내역</h2>
          <Button asChild variant={searchParams.review_only === 'true' ? 'default' : 'outline'} size="sm">
            <Link href={searchParams.review_only === 'true' ? `/dashboard/leader/report/${report.id}` : `/dashboard/leader/report/${report.id}?review_only=true`}>
              {searchParams.review_only === 'true' ? '✓ 필수 검토 요청 업무만 보기' : '필수 검토 요청 업무만 보기'}
            </Link>
          </Button>
        </div>
        
        {items?.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-md text-muted-foreground">
            업무 내역 없이 제출된 보고서입니다.
          </div>
        ) : (
          <div className="space-y-4">
            {items?.map((item) => (
              <Card key={item.id} className="overflow-hidden border-l-4" style={{
                borderLeftColor: 
                  item.status === 'Completed' ? '#16a34a' :
                  item.status === 'Delayed' ? '#dc2626' :
                  item.status === 'In Progress' ? '#2563eb' :
                  '#94a3b8'
              }}>
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground shadow-sm">
                          {CATEGORY_MAP[item.category] || item.category}
                        </span>
                        {item.requires_leader_review && (
                          <span className="inline-flex items-center rounded-md bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-800/50">
                            🚨 필수 검토 요청
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${STATUS_COLORS[item.status] || STATUS_COLORS['Planned']}`}>
                        {STATUS_MAP[item.status] || item.status}
                      </span>
                      <p className="text-xs font-semibold text-muted-foreground">
                        진행률: {item.progress}%
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {item.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground">상세 내용</h4>
                      <p className="text-sm whitespace-pre-wrap mt-1">{item.description}</p>
                    </div>
                  )}
                  {item.related_link && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground">관련 링크</h4>
                      <a href={item.related_link.startsWith('http') ? item.related_link : `https://${item.related_link}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 break-all block">
                        {item.related_link}
                      </a>
                    </div>
                  )}
                  {item.requires_leader_review && item.review_request_note && (
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-md border border-rose-100 dark:border-rose-900/50 mt-4">
                      <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">검토 요청 내용</h4>
                      <p className="text-sm whitespace-pre-wrap">{item.review_request_note}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.issues && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-100 dark:border-red-900/50">
                        <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">애로사항</h4>
                        <p className="text-sm mt-1">{item.issues}</p>
                      </div>
                    )}
                    {item.support_requested && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/50">
                        <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">지원 요청사항</h4>
                        <p className="text-sm mt-1">{item.support_requested}</p>
                      </div>
                    )}
                  </div>
                  <TaskFeedbackForm 
                    itemId={item.id} 
                    initialFeedback={taskFeedbacks.find(tf => tf.report_item_id === item.id)} 
                    leaderId={user.id} 
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="pt-8 mt-8 border-t">
        <h2 className="text-xl font-semibold mb-4">전체 코멘트 작성</h2>
        <FeedbackForm reportId={report.id} initialFeedback={feedback} leaderId={user.id} />
      </div>
    </div>
  )
}
