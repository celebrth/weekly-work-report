export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileCheck, Clock, AlertTriangle, CheckCircle2, MessageSquareDashed, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { format, startOfWeek } from "date-fns"

export default async function LeaderDashboard({
  searchParams,
}: {
  searchParams: { week?: string, member?: string, status?: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Get all members for stats and filter dropdown
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'member')
    .order('full_name')

  const totalMembers = members?.length || 0

  // 2. Get submitted reports
  let reportsQuery = supabase
    .from('reports')
    .select('*, profiles(id, full_name, email), feedbacks(id, is_visible)')
    .order('week_start_date', { ascending: false })

  if (searchParams.week) {
    reportsQuery = reportsQuery.eq('week_start_date', searchParams.week)
  }
  if (searchParams.member) {
    reportsQuery = reportsQuery.eq('user_id', searchParams.member)
  }

  const { data: submittedReports } = await reportsQuery

  // 3. Filter in memory for feedback status
  let filteredReports = submittedReports || []
  if (searchParams.status) {
    filteredReports = filteredReports.filter((report: any) => {
      // Supabase returns related items as an array if it's a 1-to-many, 
      // but if it's a 1-to-1 it might be an array or object. Let's handle both safely.
      const fbList = Array.isArray(report.feedbacks) ? report.feedbacks : (report.feedbacks ? [report.feedbacks] : [])
      const fb = fbList.length > 0 ? fbList[0] : null
      
      if (searchParams.status === 'no-feedback') return !fb
      if (searchParams.status === 'draft') return fb && fb.is_visible === false
      if (searchParams.status === 'published') return fb && fb.is_visible === true
      return true
    })
  }

  const totalSubmitted = filteredReports.length
  
  // Pending logic: Total members - members who submitted THIS week. 
  // If no week selected, this metric is harder to define clearly, so we prompt for a week.
  let pendingReports: number | string = '주간 선택'
  if (searchParams.week) {
    // We only care about unique users who submitted in this specific week
    const submittedUserIds = new Set((submittedReports || []).map(r => r.user_id))
    pendingReports = Math.max(0, totalMembers - submittedUserIds.size)
  }

  // 4. Get delayed tasks across currently filtered reports
  let itemsQuery = supabase
    .from('report_items')
    .select('id')
    .eq('status', 'Delayed')

  if (filteredReports.length > 0) {
    const reportIds = filteredReports.map(r => r.id)
    itemsQuery = itemsQuery.in('report_id', reportIds)
  } else {
    // If no reports match filters, zero delayed tasks
    itemsQuery = itemsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // force empty
  }

  const { data: delayedItems } = await itemsQuery
  const delayedCount = delayedItems?.length || 0

  // Need all visible unique weeks for the filter dropdown
  const { data: allVisibleReports } = await supabase.from('reports').select('week_start_date')
  const uniqueWeeks = Array.from(new Set(allVisibleReports?.map(r => r.week_start_date))).sort().reverse()

  // 5. Compute Team Status for the selected week (or most recent/current week)
  const currentCalendarWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const teamStatusWeek = searchParams.week || uniqueWeeks[0] || currentCalendarWeek

  let teamStatusReports: any[] = []
  if (teamStatusWeek) {
    const { data } = await supabase
      .from('reports')
      .select('id, user_id, feedbacks(id, is_visible)')
      .eq('week_start_date', teamStatusWeek)
    teamStatusReports = data || []
  }

  const teamStatusList = (members || []).map(member => {
    const report = teamStatusReports.find(r => r.user_id === member.id)
    
    let sortPriority = 1 // 미제출
    let reportId = null
    let hasVisibleFeedback = false

    if (report) {
      reportId = report.id
      const fbList = Array.isArray(report.feedbacks) ? report.feedbacks : (report.feedbacks ? [report.feedbacks] : [])
      const fb = fbList.length > 0 ? fbList[0] : null
      
      if (fb && fb.is_visible) {
        hasVisibleFeedback = true
        sortPriority = 3 // 피드백 완료
      } else {
        sortPriority = 2 // 피드백 미완료
      }
    }

    return {
      ...member,
      sortPriority,
      reportId,
      hasVisibleFeedback
    }
  }).sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) {
      return a.sortPriority - b.sortPriority
    }
    return (a.full_name || a.email).localeCompare(b.full_name || b.email)
  })

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">팀 현황</h1>
        <p className="text-muted-foreground mt-2">
          팀원의 진행 상황을 파악하고 제출된 보고서를 검토하며 피드백을 작성하세요.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 팀원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">제출된 보고서</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmitted}</div>
            <p className="text-xs text-muted-foreground">현재 필터 기준</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미제출 보고서</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports}</div>
            <p className="text-xs text-muted-foreground">선택한 주간 기준</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">지연된 업무</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delayedCount}</div>
            <p className="text-xs text-muted-foreground">필터링된 보고서 기준</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl border shadow-sm">
        <form className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-1.5 w-full md:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">주간</label>
            <select 
              name="week" 
              className="flex h-9 w-full md:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              defaultValue={searchParams.week || ""}
            >
              <option value="">전체 주간</option>
              {uniqueWeeks.map(week => (
                <option key={week} value={week}>{format(new Date(week), 'yyyy년 M월 d일')}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5 w-full md:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">팀원</label>
            <select 
              name="member" 
              className="flex h-9 w-full md:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              defaultValue={searchParams.member || ""}
            >
              <option value="">전체 팀원</option>
              {members?.map(m => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 w-full md:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">피드백 상태</label>
            <select 
              name="status" 
              className="flex h-9 w-full md:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              defaultValue={searchParams.status || ""}
            >
              <option value="">전체 상태</option>
              <option value="no-feedback">피드백 필요</option>
              <option value="draft">피드백 작성 중</option>
              <option value="published">피드백 완료</option>
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button type="submit" variant="secondary" className="w-full md:w-auto">필터 적용</Button>
            {(searchParams.week || searchParams.member || searchParams.status) && (
              <Button asChild variant="ghost" className="w-full md:w-auto">
                <Link href="/dashboard/leader">초기화</Link>
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* 팀원 상태 Section */}
      {teamStatusWeek && (
        <div className="bg-card p-5 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">팀원 상태</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(teamStatusWeek), 'yyyy년 M월 d일')} 주간 기준
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {teamStatusList.map(member => {
              let cardBg = "bg-card border-border hover:bg-accent hover:text-accent-foreground"
              if (!member.reportId) {
                cardBg = "bg-muted/30 border-transparent opacity-80"
              }

              const submissionText = member.reportId ? '제출 완료' : '미제출'
              const feedbackText = !member.reportId ? '-' : (member.hasVisibleFeedback ? '피드백 완료' : '피드백 미완료')

              const submissionColor = member.reportId 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-red-600 dark:text-red-400"
                
              const feedbackColor = !member.reportId 
                ? "text-muted-foreground"
                : (member.hasVisibleFeedback ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")

              const cardContent = (
                <div className={`flex flex-col p-3 rounded-xl border transition-colors ${cardBg} w-[160px]`}>
                  <span className="font-semibold text-sm truncate" title={member.full_name || member.email}>
                    {member.full_name || member.email}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-3 text-xs font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">제출:</span>
                      <span className={submissionColor}>{submissionText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">피드백:</span>
                      <span className={feedbackColor}>{feedbackText}</span>
                    </div>
                  </div>
                </div>
              )

              if (member.reportId) {
                return (
                  <Link href={`/dashboard/leader/report/${member.reportId}`} key={member.id} className="block group">
                    {cardContent}
                  </Link>
                )
              } else {
                return (
                  <div key={member.id} className="cursor-not-allowed" title="제출된 보고서 없음">
                    {cardContent}
                  </div>
                )
              }
            })}
          </div>
        </div>
      )}

      {/* Reports Hybrid List Layout */}
      <div>
        <h2 className="text-xl font-semibold mb-4">제출된 보고서</h2>
        
        {filteredReports.length === 0 ? (
          <div className="py-16 text-center border rounded-xl bg-card border-dashed">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <FileCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">보고서를 찾을 수 없습니다</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              현재 선택한 필터와 일치하는 제출된 보고서가 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report: any) => {
              const fbList = Array.isArray(report.feedbacks) ? report.feedbacks : (report.feedbacks ? [report.feedbacks] : [])
              const fb = fbList.length > 0 ? fbList[0] : null
              
              let feedbackBadge = (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <MessageSquareDashed className="w-3 h-3 mr-1" /> 피드백 필요
                </span>
              )

              if (fb) {
                if (fb.is_visible) {
                  feedbackBadge = (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> 피드백 완료
                    </span>
                  )
                } else {
                  feedbackBadge = (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <Eye className="w-3 h-3 mr-1" /> 피드백 작성 중
                    </span>
                  )
                }
              }

              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                    
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {report.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg leading-none">
                          {report.profiles?.full_name || report.profiles?.email || '알 수 없는 사용자'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(report.week_start_date), 'yyyy년 M월 d일')} 주간
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                      <div className="md:min-w-[120px] md:text-right">
                        {feedbackBadge}
                      </div>
                      <Button asChild className="w-full md:w-auto">
                        <Link href={`/dashboard/leader/report/${report.id}`}>
                          보고서 검토
                        </Link>
                      </Button>
                    </div>

                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
