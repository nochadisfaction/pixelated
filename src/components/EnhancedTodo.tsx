import { useState, useEffect, useRef } from 'react'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  category?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
  createdAt: string
}

interface TodoProps {
  title?: string
  initialTodos?: Omit<TodoItem, 'createdAt'>[]
  storageKey?: string
}

export function EnhancedTodo({
  title = 'Todo List',
  initialTodos = [],
  storageKey = 'enhanced-todos',
}: TodoProps) {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [inputValue, setInputValue] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<TodoItem['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load todos from localStorage on component mount
  useEffect(() => {
    const loadTodos = () => {
      try {
        const savedTodos = localStorage.getItem(storageKey)
        if (savedTodos) {
          return JSON.parse(savedTodos)
        } else if (initialTodos.length > 0) {
          // Convert initialTodos to include createdAt
          return initialTodos.map((todo) => ({
            ...todo,
            createdAt: new Date().toISOString(),
          }))
        }
        return []
      } catch (err) {
        console.error('Error loading todos:', err)
        return []
      }
    }

    setTodos(loadTodos())
  }, [initialTodos, storageKey])

  // Save todos to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(todos))
    } catch (err) {
      console.error('Error saving todos:', err)
    }
  }, [todos, storageKey])

  // Focus input when adding todo
  useEffect(() => {
    if (isAddingTodo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingTodo])

  // Generate a unique ID for each todo
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  // Add a new todo
  const addTodo = () => {
    const text = inputValue.trim()
    if (!text) {
      return
    }

    const newTodo: TodoItem = {
      id: generateId(),
      text,
      completed: false,
      category: category || undefined,
      dueDate: dueDate || undefined,
      priority: priority || undefined,
      createdAt: new Date().toISOString(),
    }

    setTodos((prevTodos) => [...prevTodos, newTodo])
    resetForm()
  }

  const resetForm = () => {
    setInputValue('')
    setCategory('')
    setPriority('medium')
    setDueDate('')
    setIsAddingTodo(false)
  }

  // Toggle todo completion status
  const toggleTodoComplete = (id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  // Delete a todo
  const deleteTodo = (id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addTodo()
  }

  // Get available categories
  const categories = Array.from(
    new Set(todos.map((todo) => todo.category).filter(Boolean) as string[]),
  )

  // Filter todos based on current filter
  const filteredTodos = todos.filter((todo) => {
    // First filter by completion status
    if (filter === 'active' && todo.completed) {
      return false
    }
    if (filter === 'completed' && !todo.completed) {
      return false
    }

    // Then filter by category
    if (categoryFilter && todo.category !== categoryFilter) {
      return false
    }

    return true
  })

  // Sort todos by priority and due date
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    // First sort by completion (incomplete first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }

    // Then sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 }
    const aPriority = a.priority || 'undefined'
    const bPriority = b.priority || 'undefined'

    if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
      return priorityOrder[aPriority] - priorityOrder[bPriority]
    }

    // Then sort by due date if available
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }

    // Finally sort by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="todo-component">
      <div className="todo-header">
        <h2 id="todo-title">{title}</h2>
        <div className="filter-controls">
          <div
            className="filter-buttons"
            role="group"
            aria-label="Filter todos"
          >
            <button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'active' : ''}
              aria-pressed={filter === 'all'}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={filter === 'active' ? 'active' : ''}
              aria-pressed={filter === 'active'}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={filter === 'completed' ? 'active' : ''}
              aria-pressed={filter === 'completed'}
            >
              Completed
            </button>
          </div>

          {categories.length > 0 && (
            <div className="category-filter">
              <label htmlFor="category-select" className="sr-only">
                Filter by category
              </label>
              <select
                id="category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {isAddingTodo ? (
        <form onSubmit={handleSubmit} className="todo-form">
          <div className="form-group">
            <label htmlFor="todo-input" className="sr-only">
              Task description
            </label>
            <input
              type="text"
              id="todo-input"
              placeholder="What needs to be done?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              ref={inputRef}
              required
              aria-required="true"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="todo-category">Category</label>
              <input
                type="text"
                id="todo-category"
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="existing-categories"
              />

              {categories.length > 0 && (
                <datalist id="existing-categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="todo-priority">Priority</label>
              <select
                id="todo-priority"
                value={priority || 'medium'}
                onChange={(e) =>
                  setPriority(e.target.value as TodoItem['priority'])
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="todo-due-date">Due Date</label>
              <input
                type="date"
                id="todo-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Add Task
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="add-todo-button"
          onClick={() => setIsAddingTodo(true)}
          aria-expanded={isAddingTodo}
          aria-controls="todo-form"
        >
          + Add Task
        </button>
      )}

      {sortedTodos.length > 0 ? (
        <ul className="todo-list" aria-labelledby="todo-title">
          {sortedTodos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority || 'medium'}`}
            >
              <div className="todo-item-main">
                <div className="todo-checkbox">
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onChange={() => toggleTodoComplete(todo.id)}
                    aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                  />

                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={todo.completed ? 'completed' : ''}
                  >
                    {todo.text}
                  </label>
                </div>
                <button
                  className="delete-button"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label={`Delete "${todo.text}"`}
                >
                  ×
                </button>
              </div>

              {(todo.category || todo.dueDate || todo.priority) && (
                <div className="todo-details">
                  {todo.category && (
                    <span className="todo-category">{todo.category}</span>
                  )}
                  {todo.priority && (
                    <span className="todo-priority">{todo.priority}</span>
                  )}
                  {todo.dueDate && (
                    <span className="todo-due-date">
                      Due: {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <p>
            {filter !== 'all'
              ? `No ${filter} tasks found`
              : 'No tasks yet. Add your first task!'}
          </p>
        </div>
      )}

      <style jsx>{`
        .todo-component {
          background-color: var(--color-bg-secondary, #f8f9fa);
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .todo-header {
          margin-bottom: 1.5rem;
        }

        .todo-header h2 {
          margin: 0 0 1rem;
          color: var(--color-primary-600, #6d28d9);
          font-size: 1.5rem;
          text-align: center;
        }

        .filter-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .filter-buttons {
          display: flex;
          border-radius: 4px;
          overflow: hidden;
        }

        .filter-buttons button {
          background-color: var(--color-bg-light, #f1f3f5);
          border: none;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-buttons button.active {
          background-color: var(--color-primary-600, #6d28d9);
          color: white;
        }

        .category-filter select {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid var(--color-border, #ddd);
          background-color: white;
        }

        .add-todo-button {
          display: block;
          width: 100%;
          padding: 0.75rem;
          background-color: var(--color-primary-500, #7c3aed);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 1.5rem;
        }

        .add-todo-button:hover {
          background-color: var(--color-primary-600, #6d28d9);
        }

        .todo-form {
          background-color: white;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          color: var(--color-text-muted, #666);
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        input[type='text'],
        input[type='date'],
        select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: var(--color-primary-500, #7c3aed);
          color: white;
        }

        .btn-primary:hover {
          background-color: var(--color-primary-600, #6d28d9);
        }

        .btn-secondary {
          background-color: var(--color-bg-light, #f1f3f5);
          color: var(--color-text, #333);
        }

        .btn-secondary:hover {
          background-color: var(--color-bg-hover, #e2e4e7);
        }

        .todo-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }

        .todo-item {
          background-color: white;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border-left: 3px solid transparent;
        }

        .todo-item.priority-high {
          border-left-color: var(--color-danger, #dc3545);
        }

        .todo-item.priority-medium {
          border-left-color: var(--color-warning, #ffc107);
        }

        .todo-item.priority-low {
          border-left-color: var(--color-success, #28a745);
        }

        .todo-item-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .todo-checkbox {
          display: flex;
          align-items: center;
          flex: 1;
          gap: 0.5rem;
        }

        .todo-checkbox input[type='checkbox'] {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
        }

        .todo-checkbox label {
          cursor: pointer;
          word-break: break-word;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .todo-checkbox label.completed {
          text-decoration: line-through;
          color: var(--color-text-muted, #888);
        }

        .delete-button {
          background-color: transparent;
          color: var(--color-text-muted, #888);
          border: none;
          border-radius: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 0.5rem;
        }

        .delete-button:hover {
          background-color: var(--color-danger, #dc3545);
          color: white;
        }

        .todo-details {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border, #eee);
          font-size: 0.75rem;
        }

        .todo-category,
        .todo-priority,
        .todo-due-date {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background-color: var(--color-bg-light, #f1f3f5);
          color: var(--color-text-muted, #666);
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--color-text-muted, #888);
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .filter-controls {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  )
}
