import { createClient } from "@/lib/supabase/server"
import { format, startOfWeek } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, FileText } from "lucide-react"
import Link from "next/link"

export default async function MemberDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get the current week's Monday as a string YYYY-MM-DD
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('week_start_date', { ascending: false })

  // Check if they already have a report for this week
  const hasCurrentWeekReport = reports?.some(r => r.week_start_date === currentWeekStart)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">내 보고서</h1>
          <p className="text-muted-foreground mt-2">
            주간 업무 보고서를 관리하고 리더의 피드백을 확인하세요.
          </p>
        </div>
        
        <Button asChild className="gap-2">
          <Link href={`/dashboard/member/report/${currentWeekStart}`}>
            {hasCurrentWeekReport ? (
              <>
                <FileText className="w-4 h-4" />
                이번 주 보고서 수정
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                이번 주 보고서 작성
              </>
            )}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl bg-card border-dashed">
            <h3 className="text-lg font-semibold">아직 보고서가 없습니다</h3>
            <p className="text-muted-foreground">첫 번째 주간 보고서를 작성하여 시작해보세요.</p>
          </div>
        ) : (
          reports?.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">
                  {format(new Date(report.week_start_date), 'yyyy년 M월 d일')} 주간
                </CardTitle>
                <CardDescription>
                  상태: <span className={`font-semibold capitalize ${report.status === 'submitted' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {report.status === 'submitted' ? '제출 완료' : report.status === 'draft' ? '작성 중' : report.status}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/member/report/${report.week_start_date}`}>
                    {report.status === 'submitted' ? '보고서 보기' : '계속 작성하기'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
