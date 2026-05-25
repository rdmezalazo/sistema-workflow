import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Award, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMemberScore } from "@/hooks/useCarteraPerformance";

interface TeamRankingCardProps {
  members: TeamMemberScore[];
  loading?: boolean;
  maxDisplay?: number;
  onMemberClick?: (member: TeamMemberScore, rank: number) => void;
}

const avatarColors = [
  "from-primary to-primary/80",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-blue-500 to-cyan-500",
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{rank}</span>;
}

export function TeamRankingCard({ members, loading, maxDisplay = 5, onMemberClick }: TeamRankingCardProps) {
  const displayMembers = members.slice(0, maxDisplay);
  const hasMore = members.length > maxDisplay;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ranking del Equipo
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Top {Math.min(maxDisplay, members.length)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Puntuación basada en entregas a tiempo
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-muted-foreground">No hay datos de rendimiento disponibles</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayMembers.map((member, index) => (
              <div
                key={member.id}
                onClick={() => onMemberClick?.(member, index + 1)}
                className={cn(
                  "p-4 flex items-center gap-4 transition-colors cursor-pointer hover:bg-muted/50",
                  index < 3 && "bg-muted/30"
                )}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(index + 1)}
                </div>

                {/* Avatar */}
                <Avatar className={cn(
                  "h-10 w-10 ring-2 ring-background shadow",
                  index < 3 && "ring-2",
                  index === 0 && "ring-amber-400",
                  index === 1 && "ring-slate-300",
                  index === 2 && "ring-amber-600"
                )}>
                  <AvatarFallback className={cn(
                    "bg-gradient-to-br text-primary-foreground text-sm font-bold",
                    avatarColors[index % avatarColors.length]
                  )}>
                    {member.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{member.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1" title="Antes del plazo">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">{member.beforeDeadlineCount}</span>
                    </div>
                    <div className="flex items-center gap-1" title="A tiempo">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-muted-foreground">{member.onTimeCount}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Después del plazo">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-muted-foreground">{member.afterDeadlineCount}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Pendientes">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{member.pendingCount}</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className={cn(
                    "text-xl font-bold",
                    index === 0 && "text-amber-500",
                    index === 1 && "text-slate-500",
                    index === 2 && "text-amber-600",
                    index > 2 && "text-foreground"
                  )}>
                    {member.totalScore}
                  </p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="p-3 text-center text-sm text-muted-foreground">
                +{members.length - maxDisplay} más
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
