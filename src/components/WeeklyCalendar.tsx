import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button'; // assuming existing UI components
import '@/styles/calendar.css';

type Session = {
  id: string;
  patient: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'CONFIRMED' | 'PENDING' | 'CANCELED';
  procedure: string;
};

type Props = {
  sessions: Session[];
  onSlotClick: (date: string, time: string) => void;
  onSessionClick: (session: Session) => void;
  onDragEnd: (result: DropResult) => void;
  weekDates: string[]; // array of 7 dates (YYYY-MM-DD) starting Monday
};

export const WeeklyCalendar: React.FC<Props> = ({ sessions, onSlotClick, onSessionClick, onDragEnd, weekDates }) => {
  const hours = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 to 20:00

  // Helper to find session for a given cell
  const findSession = (date: string, time: string) =>
    sessions.find(s => s.date === date && s.time === time);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="calendar-grid">
        {/* Header row: days */}
        <div className="calendar-header empty-cell" />
        {weekDates.map(d => (
          <div key={d} className="calendar-header day-label">
            {new Date(d).toLocaleDateString('pt-BR', { weekday: 'short' })}<br />
            {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
          </div>
        ))}
        {/* Body rows */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="time-slot label-cell">{hour}</div>
            {weekDates.map(date => {
              const session = findSession(date, hour);
              const cellId = `${date}-${hour}`;
              return (
                <Droppable droppableId={cellId} key={cellId} isDropDisabled={!!session}>
                  {(provided, snapshot) => (
                    <div
                      className={`time-slot cell ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      onClick={() => {
                        if (!session) onSlotClick(date, hour);
                      }}
                    >
                      {session ? (
                        <Draggable draggableId={session.id} index={0}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              className={`session-card status-${session.status.toLowerCase()}`}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={e => {
                                e.stopPropagation();
                                onSessionClick(session);
                              }}
                            >
                              <strong>{session.patient}</strong>
                              <span className="procedure">{session.procedure}</span>
                              <span className="status">{session.status}</span>
                            </div>
                          )}
                        </Draggable>
                      ) : null}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </DragDropContext>
  );
};
