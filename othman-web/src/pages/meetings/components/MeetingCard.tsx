import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Video,
    Clock,
    Users,
    CalendarDays,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    MapPin,
} from "lucide-react";
import { createMeetingStatusConfig } from "@/data/configData";
import { AttendeeStack } from "./AttendeeStack";
import type { Meeting, MeetingStatus } from "@/types";

const statusConfig = createMeetingStatusConfig();

export function MeetingCard({ meeting }: { meeting: Meeting }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = statusConfig[meeting.status as MeetingStatus];

    return (
        <Card className="group relative overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white dark:bg-green-950 shadow-none hover:shadow-md hover:shadow-slate-100 dark:hover:shadow-neutral-950 transition-all duration-200 hover:-translate-y-px">
            {/* Subtle left accent */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-xl transition-opacity duration-200 ${
                    meeting.status === "soon"
                        ? "bg-emerald-500 opacity-100"
                        : meeting.status === "upcoming"
                            ? "bg-blue-500 opacity-60 group-hover:opacity-100"
                            : "bg-slate-300 dark:bg-slate-600 opacity-40 group-hover:opacity-80"
                }`}
            />

            <CardHeader className="pl-5 pr-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                    {/* Title + badge */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.classes}`}
                        >
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        </div>
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-50 leading-snug truncate">
                                {meeting.title}
                            </h3>
                        </div>
                </div>
            </CardHeader>

            <CardContent className="pl-5 pr-4 space-y-3">
                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {meeting.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {meeting.time} · {meeting.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {meeting.location}
                    </span>
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-200/30" />

                {/* Attendees + expand */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-200" />
                        <AttendeeStack attendees={meeting.attendees} />
                        <span className="text-xs text-slate-500 dark:text-slate-200">
                            {meeting.attendees.length} attendee
                            {meeting.attendees.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <button
                        onClick={() => setExpanded((p) => !p)}
                        className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-200 hover:text-slate-200 dark:hover:text-slate-300 transition-colors"
                    >
                        {expanded ? (
                            <>
                                Less <ChevronUp className="h-3.5 w-3.5" />
                            </>
                        ) : (
                            <>
                                Details <ChevronDown className="h-3.5 w-3.5" />
                            </>
                        )}
                    </button>
                </div>

                {/* Expandable description */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out py-2 ${
                        expanded ? "max-h-40 opacity-100 scale-100" : "max-h-0 opacity-0 scale-0"
                    }`}
                >
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {meeting.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Organized by{" "}
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {meeting.organizer}
                        </span>
                    </p>
                </div>

                {/* Join button */}
                <a href={meeting.meetLink} target="_blank" rel="noreferrer">
                    <Button
                        className="shrink-0 h-10 px-4 gap-1.5 text-md font-lg bg-green-700 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors rounded-lg"
                    >
                        <Video className="h-5 w-5" />
                        <span>Join</span>
                        <ExternalLink className="h-5 w-5 opacity-60" />
                    </Button>
                </a>
            </CardContent>
        </Card>
    );
}
