import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import ReportEditor from "./ReportEditor"
import { format, parseISO, isValid } from "date-fns"

export default async function ReportPage({ params }: { params: { date: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const dateStr = params.date
  
  // Validate date string
  const dateObj = parseISO(dateStr)
  if (!isValid(dateObj)) {
    notFound()
  }

  // Fetch existing report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start_date', dateStr)
    .single()

  let reportItems = []
  if (report) {
    const { data: items } = await supabase
      .from('report_items')
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true })
    
    if (items) reportItems = items
  }

  // Fetch feedback if any
  let feedback = null
  let taskFeedbacks: any[] = []
  if (report) {
    const { data: fb } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('report_id', report.id)
      .eq('is_visible', true)
      .single()
    if (fb) feedback = fb

    if (reportItems.length > 0) {
      const itemIds = reportItems.map(i => i.id)
      const { data: tf } = await supabase
        .from('task_feedbacks')
        .select('*')
        .in('report_item_id', itemIds)
        .eq('is_visible', true)
      if (tf) taskFeedbacks = tf
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {format(dateObj, 'yyyy년 M월 d일')} 주간 업무보고
          </h1>
          <p className="text-muted-foreground mt-2">
            이번 주 업무와 진행 상황을 작성해주세요. 제출 전까지 임시 저장할 수 있습니다.
          </p>
        </div>
      </div>

      <ReportEditor 
        weekStartDate={dateStr}
        initialReport={report || null}
        initialItems={reportItems}
        feedback={feedback}
        taskFeedbacks={taskFeedbacks}
      />
    </div>
  )
}
