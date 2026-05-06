# Todo App Specification

## Project Overview
- **Project Name**: TodoAI
- **Type**: React Web Application
- **Core Functionality**: A fully functional todo application with task management, categories, priority levels, due dates, filtering, and persistence
- **Target Users**: Anyone needing task organization

## UI/UX Specification

### Layout Structure
- **Header**: App title + theme toggle
- **Sidebar** (desktop): Category navigation with task counts
- **Main Content**: Task list with add form
- **Responsive Breakpoints**:
  - Mobile: < 768px (stacked layout)
  - Desktop: >= 768px (sidebar + main)

### Visual Design
- **Color Palette**:
  - Primary: `#6366f1` (Indigo-500)
  - Secondary: `#8b5cf6` (Violet-500)
  - Background Dark: `#0f172a` (Slate-900)
  - Surface Dark: `#1e293b` (Slate-800)
  - Background Light: `#f8fafc` (Slate-50)
  - Surface Light: `#ffffff`
  - Success: `#22c55e` (Green-500)
  - Warning: `#f59e0b` (Amber-500)
  - Danger: `#ef4444` (Red-500)
- **Typography**:
  - Font Family: System default (Inter-like)
  - Headings: Bold
  - Body: Regular
- **Spacing**: Tailwind default scale
- **Visual Effects**:
  - Rounded corners (8px)
  - Subtle shadows
  - Smooth transitions (200ms)

### Components
1. **AddTaskForm**: Input + category select + priority select + due date + submit button
2. **TaskItem**: Checkbox + title + category badge + priority indicator + due date + delete button
3. **FilterBar**: All/Active/Completed + category filter
4. **CategoryList**: Sidebar categories with counts
5. **ThemeToggle**: Dark/light mode switch

## Functionality Specification

### Core Features
1. **Add Task**: Create task with title, category, priority, due date
2. **Toggle Complete**: Mark tasks as done/undone
3. **Delete Task**: Remove tasks
4. **Filter Tasks**: By status (All/Active/Completed)
5. **Filter by Category**: Click category in sidebar
6. **Local Storage**: Persist tasks to localStorage
7. **Dark/Light Theme**: Toggle between themes

### Data Structure
```javascript
{
  id: string,
  title: string,
  completed: boolean,
  category: 'work' | 'personal' | 'shopping' | 'health' | 'other',
  priority: 'low' | 'medium' | 'high',
  dueDate: string | null,
  createdAt: timestamp
}
```

### Categories
- Work (indigo)
- Personal (blue)
- Shopping (green)
- Health (red)
- Other (gray)

### Priority Indicators
- Low: Green dot
- Medium: Yellow dot
- High: Red dot

## Acceptance Criteria
1. User can add tasks with all fields
2. User can mark tasks complete/incomplete
3. User can delete tasks
4. User can filter by status
5. User can filter by category
6. Tasks persist after page refresh
7. Theme toggle works
8. Responsive layout works