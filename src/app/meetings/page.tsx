'use client';

import { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Video,
  Users,
  FileText,
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  body: string;
  date: string;
  time: string;
  location: string;
  virtualLink?: string;
  agendaLink?: string;
  type: 'city_council' | 'committee' | 'public_hearing' | 'board';
}

// Sample meetings - in production would come from city calendar APIs
const sampleMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Boston City Council Meeting',
    body: 'Boston City Council',
    date: '2025-01-22',
    time: '12:00 PM',
    location: 'Boston City Hall, Iannella Chamber',
    virtualLink: 'https://boston.gov/city-tv',
    agendaLink: 'https://boston.gov/departments/city-council',
    type: 'city_council',
  },
  {
    id: '2',
    title: 'Committee on Ways and Means',
    body: 'Boston City Council',
    date: '2025-01-23',
    time: '10:00 AM',
    location: 'Boston City Hall, Committee Room',
    type: 'committee',
  },
  {
    id: '3',
    title: 'Zoning Board of Appeal Hearing',
    body: 'Boston Zoning Board',
    date: '2025-01-24',
    time: '9:30 AM',
    location: 'Boston City Hall, Room 801',
    type: 'public_hearing',
  },
  {
    id: '4',
    title: 'Massachusetts House Session',
    body: 'MA House of Representatives',
    date: '2025-01-22',
    time: '11:00 AM',
    location: 'State House, Boston',
    virtualLink: 'https://malegislature.gov/Events/Sessions',
    type: 'city_council',
  },
  {
    id: '5',
    title: 'Budget Oversight Hearing',
    body: 'Joint Committee on Ways & Means',
    date: '2025-01-25',
    time: '1:00 PM',
    location: 'State House, Gardner Auditorium',
    agendaLink: 'https://malegislature.gov/Events/Hearings',
    type: 'public_hearing',
  },
];

export default function Meetings() {
  const [filter, setFilter] = useState<string>('all');

  const filteredMeetings = sampleMeetings.filter((m) => {
    if (filter === 'all') return true;
    return m.type === filter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'city_council':
        return 'bg-blue-100 text-blue-800';
      case 'committee':
        return 'bg-purple-100 text-purple-800';
      case 'public_hearing':
        return 'bg-green-100 text-green-800';
      case 'board':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'city_council':
        return 'Council';
      case 'committee':
        return 'Committee';
      case 'public_hearing':
        return 'Hearing';
      case 'board':
        return 'Board';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Public Meetings</h1>
        <p className="mt-2 text-slate-600">
          Upcoming government meetings where you can attend, observe, and participate in public comment.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">Make Your Voice Heard</h3>
            <p className="mt-1 text-sm text-blue-700">
              Massachusetts Open Meeting Law guarantees your right to attend public meetings.
              Many meetings allow public comment - check the agenda for details.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['all', 'city_council', 'committee', 'public_hearing', 'board'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {type === 'all' ? 'All Meetings' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.map((meeting) => (
          <div
            key={meeting.id}
            className="rounded-lg border border-slate-200 bg-white p-6 hover:border-blue-200 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(meeting.type)}`}>
                    {getTypeLabel(meeting.type)}
                  </span>
                  <span className="text-sm text-slate-500">{meeting.body}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{meeting.title}</h3>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDate(meeting.date)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {meeting.time}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {meeting.location}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              {meeting.virtualLink && (
                <a
                  href={meeting.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Video className="h-4 w-4" />
                  Watch Live
                </a>
              )}
              {meeting.agendaLink && (
                <a
                  href={meeting.agendaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Agenda
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Resources */}
      <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Official Meeting Calendars</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="https://www.boston.gov/public-notices"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Boston Public Notices
          </a>
          <a
            href="https://www.boston.gov/departments/city-council"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Boston City Council
          </a>
          <a
            href="https://malegislature.gov/Events"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA Legislature Events
          </a>
          <a
            href="https://malegislature.gov/Events/Hearings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA Public Hearings
          </a>
          <a
            href="https://www.sec.state.ma.us/cis/cismtg/mtgidx.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            MA Open Meeting Law
          </a>
        </div>
      </div>

      {/* How to Participate */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">How to Participate</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-slate-900">Attend In Person</h3>
            <p className="text-sm text-slate-600 mt-1">
              All public meetings are open to attendance. Arrive early for popular hearings.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Submit Written Testimony</h3>
            <p className="text-sm text-slate-600 mt-1">
              Many committees accept written testimony before hearings. Check the agenda for submission details.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Sign Up for Public Comment</h3>
            <p className="text-sm text-slate-600 mt-1">
              City council meetings often have a public comment period. Sign up at the beginning of the meeting.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Watch Online</h3>
            <p className="text-sm text-slate-600 mt-1">
              Many meetings are streamed live. Boston City TV and MA Legislature provide live streams.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
