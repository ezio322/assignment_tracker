import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, CheckCircle, Clock, AlertCircle, User, LogOut, LogIn } from 'lucide-react';

// Supabase configuration - Replace with your actual Supabase URL and anon key
const SUPABASE_URL = 'https://hfrlkbwhqaqunhsykbbs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcmxrYndocWFxdW5oc3lrYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODM3MTgsImV4cCI6MjA2NDQ1OTcxOH0.qPP-EHKSVweM_nW4eiVT_N8XRiTC0AWdh6lEYfB-mFA';

// Supabase client simulation for demo purposes
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function AssignmentTracker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    due_date: ''
  });
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Initialize app and check for existing session
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        await loadData();
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all data from Supabase
  const loadData = async () => {
    try {
      // Load users
      const { data: usersData } = await supabase.from('users').select('*').execute();
      setUsers(usersData || []);

      // Load assignments with creator info
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`
          *,
          users:created_by (name, email)
        `)
        .execute();
      
      setAssignments(assignmentsData || []);

      // Load completions
      const { data: completionsData } = await supabase
        .from('assignment_completions')
        .select('*')
        .execute();
      
      setCompletions(completionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Authentication functions
  const handleSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: {
            name: authForm.name,
          }
        }
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        await supabase.from('users').insert([
          {
            id: data.user.id,
            name: authForm.name,
            email: authForm.email
          }
        ]).execute();

        setUser(data.user);
        setShowAuthForm(false);
        await loadData();
      }
    } catch (error) {
      console.error('Error signing up:', error);
      alert('Error signing up: ' + error.message);
    }
  };

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });

      if (error) throw error;

      setUser(data.user);
      setShowAuthForm(false);
      await loadData();
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Error signing in: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAssignments([]);
      setCompletions([]);
      setUsers([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Assignment functions
  const handleCreateAssignment = async () => {
    if (!newAssignment.title || !newAssignment.due_date || !user) return;

    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([
          {
            title: newAssignment.title,
            description: newAssignment.description,
            due_date: newAssignment.due_date,
            created_by: user.id
          }
        ])
        .select('*')
        .execute();

      if (error) throw error;

      // Add to local state
      setAssignments([data[0], ...assignments]);
      setNewAssignment({ title: '', description: '', due_date: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Error creating assignment: ' + error.message);
    }
  };

  const handleCompleteAssignment = async (assignmentId) => {
    if (!user || hasUserCompleted(assignmentId)) return;

    try {
      const { data, error } = await supabase
        .from('assignment_completions')
        .insert([
          {
            assignment_id: assignmentId,
            user_id: user.id
          }
        ])
        .select('*')
        .execute();

      if (error) throw error;

      // Add to local state
      setCompletions([...completions, data[0]]);
    } catch (error) {
      console.error('Error completing assignment:', error);
      alert('Error completing assignment: ' + error.message);
    }
  };

  // Helper functions
  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const hasUserCompleted = (assignmentId) => {
    return completions.some(c => c.assignment_id === assignmentId && c.user_id === user?.id);
  };

  const getCompletionCount = (assignmentId) => {
    return completions.filter(c => c.assignment_id === assignmentId).length;
  };

  const getStatusColor = (assignment) => {
    const daysUntil = getDaysUntilDue(assignment.due_date);
    const completionRate = getCompletionCount(assignment.id) / users.length;
    
    if (completionRate === 1) return 'text-green-600 bg-green-100';
    if (daysUntil < 0) return 'text-red-600 bg-red-100';
    if (daysUntil <= 2) return 'text-orange-600 bg-orange-100';
    return 'text-blue-600 bg-blue-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Assignment Tracker
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to manage and track assignments
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <button
              onClick={() => setShowAuthForm(true)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Get Started
            </button>
          </div>

          {/* Auth Modal */}
          {showAuthForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </h3>
                  
                  {authMode === 'signup' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={authForm.name}
                        onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <button
                      onClick={authMode === 'signin' ? handleSignIn : handleSignUp}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                    
                    <button
                      onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                    </button>
                    
                    <button
                      onClick={() => setShowAuthForm(false)}
                      className="text-sm text-gray-600 hover:text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Assignment Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{user.email}</span>
              </div>
              <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-gray-700">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-blue-100 text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-green-100 text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed by Me</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completions.filter(c => c.user_id === user.id).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-md bg-orange-100 text-orange-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Due Soon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignments.filter(a => getDaysUntilDue(a.due_date) <= 3 && getDaysUntilDue(a.due_date) >= 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Assignment Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </button>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Assignment</h3>
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({...newAssignment, due_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAssignment}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const daysUntil = getDaysUntilDue(assignment.due_date);
            const isCompleted = hasUserCompleted(assignment.id);
            const completionCount = getCompletionCount(assignment.id);
            const completionRate = users.length > 0 ? completionCount / users.length : 0;
            const createdBy = users.find(u => u.id === assignment.created_by);

            return (
              <div key={assignment.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment)}`}>
                          {completionRate === 1 ? 'Complete' : 
                           daysUntil < 0 ? 'Overdue' : 
                           daysUntil <= 2 ? 'Due Soon' : 'Active'}
                        </span>
                      </div>
                      
                      {assignment.description && (
                        <p className="text-gray-600 mb-3">{assignment.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                          {daysUntil >= 0 && (
                            <span className="ml-1">({daysUntil} days)</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{completionCount}/{users.length} completed</span>
                        </div>
                        <span>By: {createdBy?.name || 'Unknown'}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(completionRate * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-6">
                      {isCompleted ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCompleteAssignment(assignment.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reminder Alert */}
                  {daysUntil <= 2 && daysUntil >= 0 && !isCompleted && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Reminder:</strong> This assignment is due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {assignments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new assignment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignmentTracker;
