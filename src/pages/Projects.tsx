import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ChevronRight, ChevronLeft, FolderKanban, Folder, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Project, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { TaskEditDialog } from '@/components/TaskEditDialog';

interface Board {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setProjects((data as Project[]) || []);
    const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', user.id).not('project_id', 'is', null).order('priority', { ascending: true });
    const grouped: Record<string, Task[]> = {};
    (tasks as Task[] || []).forEach((t) => {
      if (t.project_id) { if (!grouped[t.project_id]) grouped[t.project_id] = []; grouped[t.project_id].push(t); }
    });
    setTasksByProject(grouped);
  };

  const fetchBoards = async (projectId: string) => {
    const { data } = await supabase.from('project_boards').select('*').eq('project_id', projectId).order('sort_order');
    setBoards((data as Board[]) || []);
  };

  useEffect(() => { fetchProjects(); }, [user]);
  useEffect(() => { if (selectedProject) fetchBoards(selectedProject.id); }, [selectedProject]);

  const createProject = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from('projects').insert({ user_id: user.id, name: newName.trim() });
    if (error) toast.error(error.message);
    else { setNewName(''); setShowNew(false); fetchProjects(); }
  };

  const createBoard = async () => {
    if (!newBoardName.trim() || !user || !selectedProject) return;
    const { error } = await supabase.from('project_boards').insert({
      user_id: user.id, project_id: selectedProject.id,
      name: newBoardName.trim(), sort_order: boards.length,
    });
    if (error) toast.error(error.message);
    else { setNewBoardName(''); setShowNewBoard(false); fetchBoards(selectedProject.id); }
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) toast.error(error.message);
    else { toast.success('Project deleted'); setSelectedProject(null); fetchProjects(); }
  };

  const addTaskToColumn = async (status: string) => {
    if (!newTaskTitle.trim() || !user || !selectedProject) return;
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: newTaskTitle.trim(),
      project_id: selectedProject.id,
      status: status as any,
      board_id: selectedBoard || null,
    });
    if (error) toast.error(error.message);
    else { setNewTaskTitle(''); setAddingInColumn(null); fetchProjects(); }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) toast.error(error.message);
    else fetchProjects();
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    
    // Optimistic update
    setTasksByProject(prev => {
      const updated = { ...prev };
      if (selectedProject && updated[selectedProject.id]) {
        updated[selectedProject.id] = updated[selectedProject.id].map(t =>
          t.id === taskId ? { ...t, status: newStatus as any } : t
        );
      }
      return updated;
    });

    const updateData: any = { status: newStatus };
    if (newStatus === 'done') updateData.completed_at = new Date().toISOString();
    else updateData.completed_at = null;

    const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
    if (error) { toast.error(error.message); fetchProjects(); }
  };

  const kanbanColumns = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
  ];

  // Kanban view for selected project
  if (selectedProject) {
    const projectTasks = tasksByProject[selectedProject.id] || [];
    const filteredTasks = selectedBoard
      ? projectTasks.filter(t => t.board_id === selectedBoard)
      : projectTasks;

    return (
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedProject(null); setSelectedBoard(null); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-[-0.03em]">{selectedProject.name}</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {projectTasks.filter(t => t.status !== 'done').length} active · {projectTasks.filter(t => t.status === 'done').length} done
            </p>
          </div>
          <button
            onClick={() => { if (confirm('Delete this project and all its tasks?')) deleteProject(selectedProject.id); }}
            className="p-2 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-folders / Boards */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedBoard(null)}
            className={cn(
              'text-[11px] px-3 py-1.5 rounded-md whitespace-nowrap transition-colors',
              !selectedBoard ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground bg-secondary'
            )}
          >
            All
          </button>
          {boards.map(b => (
            <button key={b.id} onClick={() => setSelectedBoard(b.id)}
              className={cn(
                'text-[11px] px-3 py-1.5 rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5',
                selectedBoard === b.id ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground bg-secondary'
              )}
            >
              <Folder className="h-3 w-3" />{b.name}
            </button>
          ))}
          {showNewBoard ? (
            <div className="flex gap-1.5">
              <Input value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
                placeholder="Board name" className="h-7 w-32 text-[11px] bg-secondary border-0"
                autoFocus onKeyDown={e => e.key === 'Enter' && createBoard()} />
              <Button size="sm" className="h-7 text-[10px] px-2" onClick={createBoard}>Add</Button>
            </div>
          ) : (
            <button onClick={() => setShowNewBoard(true)}
              className="text-[11px] px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Kanban with drag & drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
            <div className="grid grid-cols-3 gap-4 min-w-[480px]">
            {kanbanColumns.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.key);
              return (
                <Droppable key={col.key} droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'rounded-lg p-3 min-h-[250px] transition-colors',
                        snapshot.isDraggingOver ? 'bg-secondary/60' : 'bg-secondary/30'
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.08em]">{col.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground/60 bg-secondary rounded-full px-1.5 py-0.5">{colTasks.length}</span>
                          <button
                            onClick={() => { setAddingInColumn(col.key); setNewTaskTitle(''); }}
                            className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Add task inline */}
                      {addingInColumn === col.key && (
                        <div className="mb-2">
                          <Input
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="h-8 text-[12px] bg-background border-border/50"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') addTaskToColumn(col.key);
                              if (e.key === 'Escape') setAddingInColumn(null);
                            }}
                            onBlur={() => { if (!newTaskTitle.trim()) setAddingInColumn(null); }}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        {colTasks.map((t, index) => (
                          <Draggable key={t.id} draggableId={t.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'group bg-background rounded-md p-3 border transition-all',
                                  snapshot.isDragging
                                    ? 'border-foreground/20 shadow-lg rotate-1'
                                    : 'border-border/50 hover:border-border'
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className={cn('text-[12px] leading-snug flex-1', t.status === 'done' && 'line-through text-muted-foreground')}>{t.title}</p>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingTask(t); }}
                                      className="p-0.5 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground transition-colors shrink-0"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}
                                      className="p-0.5 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive transition-colors shrink-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  <span className={cn('w-1.5 h-1.5 rounded-full', contextDot(t.context))} />
                                  <span className={cn('text-[10px] font-medium', priorityText(t.priority))}>{t.priority.toUpperCase()}</span>
                                  {t.estimated_duration_min && (
                                    <span className="text-[10px] text-muted-foreground">~{t.estimated_duration_min}m</span>
                                  )}
                                  {t.board_id && boards.find(b => b.id === t.board_id) && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium truncate max-w-[80px]">
                                      {boards.find(b => b.id === t.board_id)!.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colTasks.length === 0 && !addingInColumn && (
                          <p className="text-[11px] text-muted-foreground/30 text-center py-8">Drop tasks here</p>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
            </div>
          </div>
        </DragDropContext>

        <TaskEditDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => { if (!open) setEditingTask(null); }}
          onSaved={fetchProjects}
        />
      </div>
    );
  }

  // Project list
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Projects</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New
        </Button>
      </div>

      {showNew && (
        <div className="flex gap-2 mb-6">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name"
            className="h-10 bg-secondary border-0 text-[13px]" autoFocus onKeyDown={(e) => e.key === 'Enter' && createProject()} />
          <Button onClick={createProject} size="sm" className="h-10">Create</Button>
        </div>
      )}

      <div className="space-y-2">
        {projects.map((p) => {
          const tasks = tasksByProject[p.id] || [];
          const active = tasks.filter(t => t.status !== 'done').length;
          const done = tasks.filter(t => t.status === 'done').length;

          return (
            <div key={p.id} className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
              <button className="flex-1 flex items-center gap-3 text-left" onClick={() => setSelectedProject(p)}>
                <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{active} active · {done} done</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this project?')) deleteProject(p.id); }}
                className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive transition-colors"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function contextDot(ctx: string) {
  const map: Record<string, string> = {
    work: 'bg-gigi-work', school: 'bg-gigi-school', personal: 'bg-gigi-personal', admin: 'bg-gigi-admin',
  };
  return map[ctx] || 'bg-muted-foreground';
}

function priorityText(p: string) {
  const map: Record<string, string> = {
    p1: 'text-gigi-p1', p2: 'text-gigi-p2', p3: 'text-muted-foreground', p4: 'text-muted-foreground/60',
  };
  return map[p] || 'text-muted-foreground';
}
