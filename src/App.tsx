import React, { useState, useEffect } from 'react';
import { 
  UserRole, 
  Question, 
  Test, 
  Student, 
  ExamSubmission, 
  AppSettings, 
  CandidateStatus 
} from './types';
import { 
  loadDatabase, 
  saveDatabase, 
  resetDatabaseToDefaults, 
  AppDatabaseState,
  loadDatabaseFromFirestore,
  syncDatabaseToFirestore
} from './services/storage';
import { auth, logout } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Navbar, ActiveTab } from './components/Navbar';
import { HomePortal } from './components/HomePortal';
import { Dashboard } from './components/Dashboard';
import { QuestionBank } from './components/QuestionBank';
import { QuestionEditorModal } from './components/QuestionEditorModal';
import { TestBuilder } from './components/TestBuilder';
import { StudentManager } from './components/StudentManager';
import { ExamRunner } from './components/ExamRunner';
import { ResultsAnalysis } from './components/ResultsAnalysis';
import { NominationList } from './components/NominationList';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { SupervisorAuthModal } from './components/SupervisorAuthModal';

export default function App() {
  // Main Database State loaded from persistent storage / initial seed
  const [dbState, setDbState] = useState<AppDatabaseState>(() => loadDatabase());
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  // Auth Monitoring
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email === 'osamaabedy@gmail.com') {
        setIsSupervisorVerified(true);
        sessionStorage.setItem('supervisor_auth_verified', 'true');
        // If supervisor logs in, try to load from cloud
        handleLoadFromCloud();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoadFromCloud = async () => {
    setIsCloudLoading(true);
    try {
      const cloudData = await loadDatabaseFromFirestore();
      if (cloudData) {
        setDbState(cloudData);
        console.log('Data loaded from Firestore successfully.');
      }
    } catch (err) {
      console.warn('Failed to load from cloud, using local data.', err);
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleSyncToCloud = async () => {
    await syncDatabaseToFirestore(dbState);
    console.log('تمت مزامنة البيانات مع السحابة بنجاح');
  };

  // Role and Navigation
  const [role, setRole] = useState<UserRole>('supervisor');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Supervisor verification via email OSAMAABEDY@GMAIL.COM
  const [isSupervisorVerified, setIsSupervisorVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('supervisor_auth_verified') === 'true';
  });
  const [isSupervisorAuthModalOpen, setIsSupervisorAuthModalOpen] = useState(false);
  const [pendingSupervisorTab, setPendingSupervisorTab] = useState<ActiveTab | null>(null);

  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('riyadh_ibda_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('riyadh_ibda_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('riyadh_ibda_theme', 'light');
    }
  }, [darkMode]);

  // Persist DB state on changes
  useEffect(() => {
    saveDatabase(dbState);
  }, [dbState]);

  // Modals & Interactive Flow States
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

  // Student Exam Taking Portal state
  const [isExamActive, setIsExamActive] = useState(false);
  const [examStudent, setExamStudent] = useState<Student | null>(null);
  const [examTestId, setExamTestId] = useState<string | undefined>(undefined);
  const [examModelId, setExamModelId] = useState<string | undefined>(undefined);

  // Reports state
  const [selectedReportSubId, setSelectedReportSubId] = useState<string | null>(null);

  // Quick switch role
  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'student') {
      setIsExamActive(true);
      setExamStudent(null);
      setExamTestId(dbState.tests[0]?.id);
      setExamModelId(dbState.tests[0]?.models[0]?.id);
    } else {
      setIsExamActive(false);
    }
  };

  // Launch Exam as Student
  const handleLaunchStudentExam = (student?: Student, testId?: string, modelId?: string) => {
    setRole('student');
    setIsExamActive(true);
    setExamStudent(student || null);
    setExamTestId(testId || dbState.tests[0]?.id);
    setExamModelId(modelId || dbState.tests[0]?.models[0]?.id);
  };

  // Finish Exam Submission
  const handleFinishExam = (newSubmission: ExamSubmission) => {
    // Add submission to db
    const updatedSubmissions = [newSubmission, ...dbState.submissions];
    
    // Update student status to completed
    const updatedStudents = dbState.students.map(s => {
      if (s.id === newSubmission.studentId) {
        return { ...s, status: 'completed' as const };
      }
      return s;
    });

    // Update question usage stats
    const updatedQuestions = dbState.questions.map(q => {
      // Find any answer that corresponds to this original question ID
      const studentAns = Object.values(newSubmission.answers).find(ans => 
        ans.originalQuestionId === q.id || ans.questionId === q.id
      );

      if (studentAns) {
        return {
          ...q,
          usageCount: q.usageCount + 1,
          correctAnswersCount: studentAns.isCorrect ? q.correctAnswersCount + 1 : q.correctAnswersCount,
        };
      }
      return q;
    });

    setDbState(prev => ({
      ...prev,
      submissions: updatedSubmissions,
      students: updatedStudents,
      questions: updatedQuestions,
    }));
  };

  const handleRequestTab = (targetTab: ActiveTab) => {
    if (targetTab === 'home') {
      setActiveTab('home');
      return;
    }

    if (isSupervisorVerified) {
      setActiveTab(targetTab);
    } else {
      setPendingSupervisorTab(targetTab);
      setIsSupervisorAuthModalOpen(true);
    }
  };

  const handleSupervisorAuthSuccess = () => {
    sessionStorage.setItem('supervisor_auth_verified', 'true');
    setIsSupervisorVerified(true);
    setIsSupervisorAuthModalOpen(false);
    if (pendingSupervisorTab) {
      setActiveTab(pendingSupervisorTab);
      setPendingSupervisorTab(null);
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleExitExam = () => {
    setIsExamActive(false);
    setRole('supervisor'); // Reset role to supervisor to exit student portal
    setActiveTab('home');
  };

  // Question Management Handlers
  const handleOpenAddQuestion = () => {
    setQuestionToEdit(null);
    setIsQuestionModalOpen(true);
  };

  const handleEditQuestion = (q: Question) => {
    setQuestionToEdit(q);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = (savedQ: Question) => {
    setDbState(prev => {
      const exists = prev.questions.some(q => q.id === savedQ.id);
      return {
        ...prev,
        questions: exists
          ? prev.questions.map(q => q.id === savedQ.id ? savedQ : q)
          : [savedQ, ...prev.questions],
      };
    });
  };

  const handleDeleteQuestion = (id: string) => {
    setDbState(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }));
  };

  const handleDuplicateQuestion = (q: Question) => {
    const duplicated: Question = {
      ...q,
      id: `q_${Date.now()}`,
      code: `${q.code}-COPY`,
      title: `${q.title} (نسخة مكررة)`,
      usageCount: 0,
      correctAnswersCount: 0,
    };
    setDbState(prev => ({
      ...prev,
      questions: [duplicated, ...prev.questions],
    }));
  };

  const handleBulkAddQuestions = (newQuestions: Question[]) => {
    setDbState(prev => ({
      ...prev,
      questions: [...newQuestions, ...prev.questions],
    }));
  };

  // Test Management Handlers
  const handleSaveTest = (savedTest: Test) => {
    setDbState(prev => {
      const exists = prev.tests.some(t => t.id === savedTest.id);
      return {
        ...prev,
        tests: exists
          ? prev.tests.map(t => t.id === savedTest.id ? savedTest : t)
          : [savedTest, ...prev.tests],
      };
    });
  };

  const handleDeleteTest = (testId: string) => {
    setDbState(prev => ({
      ...prev,
      tests: prev.tests.filter(t => t.id !== testId),
    }));
  };

  // Student Management Handlers
  const handleAddStudent = (newStudent: Student) => {
    setDbState(prev => ({
      ...prev,
      students: [newStudent, ...prev.students],
    }));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setDbState(prev => {
      const isResetting = updatedStudent.status === 'not_started';
      
      return {
        ...prev,
        students: prev.students.map(s => s.id === updatedStudent.id ? {
          ...updatedStudent,
          // Ensure status is correctly set and clear any assigned date/metadata
          status: isResetting ? 'not_started' : updatedStudent.status,
          assignedDate: isResetting ? undefined : s.assignedDate
        } : s),
        submissions: isResetting 
          ? prev.submissions.filter(sub => sub.studentId !== updatedStudent.id)
          : prev.submissions
      };
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    setDbState(prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== studentId),
    }));
  };

  // Update Candidate Status & Notes
  const handleUpdateCandidateStatus = (submissionId: string, status: CandidateStatus, notes?: string) => {
    setDbState(prev => ({
      ...prev,
      submissions: prev.submissions.map(sub => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            candidateStatus: status,
            supervisorNotes: notes !== undefined ? notes : sub.supervisorNotes,
          };
        }
        return sub;
      }),
    }));
  };

  // Open Report for specific submission
  const handleOpenReportForSubmission = (submissionId: string) => {
    setSelectedReportSubId(submissionId);
    setActiveTab('reports');
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: AppSettings) => {
    setDbState(prev => ({
      ...prev,
      settings: newSettings,
    }));
  };

  const handleResetAllData = () => {
    const defaults = resetDatabaseToDefaults();
    setDbState(defaults);
  };

  const handleImportDatabase = (imported: AppDatabaseState) => {
    setDbState(imported);
    saveDatabase(imported);
  };

  const handleResetStudentTest = (studentId: string) => {
    setDbState(prev => {
      const student = prev.students.find(s => s.id === studentId);
      if (!student) return prev;

      const updatedStudents = prev.students.map(s => 
        s.id === studentId ? { ...s, status: 'not_started' as const, assignedDate: undefined } : s
      );
      const updatedSubmissions = prev.submissions.filter(sub => sub.studentId !== studentId);
      const nextState = {
        ...prev,
        students: updatedStudents,
        submissions: updatedSubmissions
      };
      saveDatabase(nextState);
      console.log(`Student ${student.fullName} has been reset for re-testing.`);
      return nextState;
    });
  };

  const handleLogout = async () => {
    await logout();
    setIsSupervisorVerified(false);
    sessionStorage.removeItem('supervisor_auth_verified');
    setRole('student');
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Navigation Header - Hidden during active exam */}
      {!(role === 'student' || isExamActive || activeTab === 'home') && (
        <Navbar
          role={role}
          setRole={handleSetRole}
          activeTab={activeTab}
          setActiveTab={handleRequestTab}
          settings={dbState.settings}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(prev => !prev)}
          onLaunchStudentExam={() => handleLaunchStudentExam()}
          isSupervisor={isSupervisorVerified}
          onLogout={handleLogout}
          onSync={handleSyncToCloud}
        />
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* If in student taking mode */}
        {role === 'student' || isExamActive ? (
          <ExamRunner
            currentStudent={examStudent}
            students={dbState.students}
            tests={dbState.tests}
            questions={dbState.questions}
            settings={dbState.settings}
            preselectedTestId={examTestId}
            preselectedModelId={examModelId}
            onFinishExam={handleFinishExam}
            onExitExam={handleExitExam}
            onResetStudentTest={handleResetStudentTest}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomePortal
                settings={dbState.settings}
                onEnterStudent={() => handleLaunchStudentExam()}
                onEnterSupervisor={() => handleRequestTab('dashboard')}
                onOpenTests={() => handleRequestTab('test_builder')}
                onOpenResults={() => handleRequestTab('results')}
              />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                questions={dbState.questions}
                tests={dbState.tests}
                students={dbState.students}
                submissions={dbState.submissions}
                settings={dbState.settings}
                setActiveTab={setActiveTab}
                onOpenQuestionModal={handleOpenAddQuestion}
                onSelectSubmissionForReview={handleOpenReportForSubmission}
              />
            )}

            {activeTab === 'question_bank' && (
              <QuestionBank
                questions={dbState.questions}
                settings={dbState.settings}
                onOpenAddModal={handleOpenAddQuestion}
                onEditQuestion={handleEditQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onDuplicateQuestion={handleDuplicateQuestion}
                onBulkAddQuestions={handleBulkAddQuestions}
              />
            )}

            {activeTab === 'test_builder' && (
              <TestBuilder
                tests={dbState.tests}
                questions={dbState.questions}
                settings={dbState.settings}
                onSaveTest={handleSaveTest}
                onDeleteTest={handleDeleteTest}
                onLaunchStudentExamWithTest={(tId, mId) => handleLaunchStudentExam(undefined, tId, mId)}
              />
            )}

            {activeTab === 'students' && (
              <StudentManager
                students={dbState.students}
                tests={dbState.tests}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onLaunchExamForStudent={(st, tId, mId) => handleLaunchStudentExam(st, tId, mId)}
                onResetStudentTest={handleResetStudentTest}
              />
            )}

            {activeTab === 'results' && (
              <ResultsAnalysis
                submissions={dbState.submissions}
                students={dbState.students}
                tests={dbState.tests}
                questions={dbState.questions}
                settings={dbState.settings}
                onOpenReportForSubmission={handleOpenReportForSubmission}
                onUpdateCandidateStatus={handleUpdateCandidateStatus}
                onResetStudentTest={handleResetStudentTest}
              />
            )}

            {activeTab === 'nominations' && (
              <NominationList
                submissions={dbState.submissions}
                students={dbState.students}
                tests={dbState.tests}
                settings={dbState.settings}
                onUpdateCandidateStatus={handleUpdateCandidateStatus}
                onOpenReportForSubmission={handleOpenReportForSubmission}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                submissions={dbState.submissions}
                students={dbState.students}
                tests={dbState.tests}
                settings={dbState.settings}
                selectedSubmissionId={selectedReportSubId}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={dbState.settings}
                onSaveSettings={handleSaveSettings}
                onResetAllData={handleResetAllData}
                fullDatabaseState={dbState}
                onImportDatabase={handleImportDatabase}
              />
            )}
          </>
        )}
      </main>

      {/* Global Question Creator / Editor Modal */}
      <QuestionEditorModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        questionToEdit={questionToEdit}
        onSaveQuestion={handleSaveQuestion}
      />

      {/* Supervisor Email Verification Modal */}
      <SupervisorAuthModal
        isOpen={isSupervisorAuthModalOpen}
        onClose={() => {
          setIsSupervisorAuthModalOpen(false);
          setPendingSupervisorTab(null);
        }}
        onSuccess={handleSupervisorAuthSuccess}
      />

      {/* Footer (Hidden in print) */}
      <footer className="bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {dbState.settings.schoolName} – {dbState.settings.platformName}
          </span>
          <span className="font-medium text-slate-400">
            إشراف: {dbState.settings.supervisorName} | منسق الموهوبين أسامة ابراهيم | نظام الكشف المبدئي المعتمد
          </span>
        </div>
      </footer>
    </div>
  );
}
