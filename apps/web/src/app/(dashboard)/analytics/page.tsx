"use client";

import * as React from "react";
import {
  Brain,
  Calendar,
  Clock,
  ClipboardList,
  Flame,
  GraduationCap,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Stats Card with Trend
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = "primary",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  color?: "primary" | "green" | "orange" | "blue";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && (
            <div
              className={cn(
                "flex items-center text-xs font-medium",
                trend.positive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Bar Chart Component
function SimpleBarChart({
  data,
  maxValue,
}: {
  data: { label: string; value: number; color?: string }[];
  maxValue: number;
}) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", item.color || "bg-primary")}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Activity Heatmap (simplified)
function ActivityHeatmap() {
  // Generate mock activity data for last 7 weeks
  const weeks = 7;
  const days = 7;
  const activityData = Array.from({ length: weeks }, () =>
    Array.from({ length: days }, () => Math.floor(Math.random() * 5))
  );

  const getColor = (value: number) => {
    if (value === 0) return "bg-muted";
    if (value === 1) return "bg-primary/20";
    if (value === 2) return "bg-primary/40";
    if (value === 3) return "bg-primary/60";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {activityData.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((activity, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  "h-3 w-3 rounded-sm",
                  getColor(activity)
                )}
                title={`${activity} sessions`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn("h-3 w-3 rounded-sm", getColor(level))}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Subject Performance Card
function SubjectPerformance({
  subject,
  accuracy,
  cardsStudied,
  trend,
}: {
  subject: string;
  accuracy: number;
  cardsStudied: number;
  trend: "up" | "down" | "stable";
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{subject}</h4>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-green-600" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-red-600" />}
        </div>
        <Progress
          value={accuracy}
          className={cn(
            "h-2",
            accuracy >= 80
              ? "[&>div]:bg-green-500"
              : accuracy >= 60
                ? "[&>div]:bg-yellow-500"
                : "[&>div]:bg-red-500"
          )}
        />
        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <span>{accuracy}% accuracy</span>
          <span>{cardsStudied} cards</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = React.useState("week");

  // Mock data
  const weeklyStats = {
    studyTime: "12h 45m",
    cardsReviewed: 342,
    quizzesTaken: 8,
    streak: 14,
    accuracy: 78,
  };

  const studyTimeData = [
    { label: "Monday", value: 45, color: "bg-primary" },
    { label: "Tuesday", value: 60, color: "bg-primary" },
    { label: "Wednesday", value: 30, color: "bg-primary" },
    { label: "Thursday", value: 90, color: "bg-primary" },
    { label: "Friday", value: 75, color: "bg-primary" },
    { label: "Saturday", value: 120, color: "bg-primary" },
    { label: "Sunday", value: 45, color: "bg-primary" },
  ];

  const subjectPerformance = [
    { subject: "Biology", accuracy: 85, cardsStudied: 120, trend: "up" as const },
    { subject: "Chemistry", accuracy: 72, cardsStudied: 95, trend: "down" as const },
    { subject: "Physics", accuracy: 68, cardsStudied: 80, trend: "up" as const },
    { subject: "Mathematics", accuracy: 91, cardsStudied: 150, trend: "stable" as const },
  ];

  const achievements = [
    { title: "7-Day Streak", icon: Flame, unlocked: true },
    { title: "100 Cards Mastered", icon: Brain, unlocked: true },
    { title: "Perfect Quiz", icon: Trophy, unlocked: true },
    { title: "Early Bird", icon: Clock, unlocked: false },
    { title: "Night Owl", icon: Zap, unlocked: false },
    { title: "Course Completed", icon: GraduationCap, unlocked: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your learning progress and study habits.
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">Last 3 Months</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Study Time"
          value={weeklyStats.studyTime}
          description="Total this week"
          icon={Clock}
          trend={{ value: 12, positive: true }}
          color="blue"
        />
        <StatCard
          title="Cards Reviewed"
          value={weeklyStats.cardsReviewed}
          description="Flashcards studied"
          icon={Brain}
          trend={{ value: 8, positive: true }}
          color="primary"
        />
        <StatCard
          title="Quizzes Taken"
          value={weeklyStats.quizzesTaken}
          description="Completed this week"
          icon={ClipboardList}
          trend={{ value: 15, positive: true }}
          color="green"
        />
        <StatCard
          title="Study Streak"
          value={`${weeklyStats.streak} days`}
          description="Keep it going!"
          icon={Flame}
          color="orange"
        />
        <StatCard
          title="Avg. Accuracy"
          value={`${weeklyStats.accuracy}%`}
          description="Quiz & flashcard"
          icon={Target}
          trend={{ value: 5, positive: true }}
          color="green"
        />
      </div>

      {/* Charts and Details */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Study Time Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Study Time</CardTitle>
            <CardDescription>
              Minutes spent studying each day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={studyTimeData}
              maxValue={Math.max(...studyTimeData.map((d) => d.value))}
            />
          </CardContent>
        </Card>

        {/* Activity Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Your study sessions over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap />
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance & Achievements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>
              Your accuracy by subject area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectPerformance.map((subject) => (
              <SubjectPerformance key={subject.subject} {...subject} />
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>
              Badges and milestones you&apos;ve earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.title}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg text-center",
                      achievement.unlocked
                        ? "bg-primary/10"
                        : "bg-muted opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full",
                        achievement.unlocked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">
                      {achievement.title}
                    </span>
                    {achievement.unlocked && (
                      <Badge variant="secondary" className="text-[10px]">
                        Unlocked
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Study Insights</CardTitle>
          <CardDescription>
            Personalized recommendations based on your activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  Great Progress!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your Biology accuracy improved by 12% this week.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <Target className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                  Focus Area
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Chemistry needs more review. Consider adding extra sessions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Best Study Time
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You perform best on Saturdays. Schedule important reviews then.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
